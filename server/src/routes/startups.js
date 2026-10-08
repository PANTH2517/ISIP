/** Module 2 — Startup Registration (Pending → Approved → Incubated once financed) and team members. */
import { Router } from 'express';
import { Startup, StartupMember, User, Mentor, MentorAssignment, Milestone, Document, InvestmentInterest, InvestorMeeting, Investor, DEFAULT_MILESTONES, sequelize } from '../models/index.js';
import { likeOp } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { loadStartup, visibleStartupIds, recalcProgress, financeSummary, investorFor, ACTIVE_ASSIGNMENT } from '../services/access.js';
import { notify, adminIds, mentorUserIdsForStartup } from '../services/notify.js';
import { removeFile } from '../middleware/upload.js';
import { HttpError, requireFields, pick } from '../utils/http.js';

const router = Router();
router.use(authenticate);

const EDITABLE = ['startupName', 'industry', 'description', 'problemStatement', 'solution', 'businessModel', 'technologyStack'];
const REQUIRED_FOR_SUBMISSION = ['startupName', 'industry', 'description', 'problemStatement', 'solution', 'businessModel'];

const mentorInclude = {
  model: MentorAssignment, as: 'assignments', required: false, where: { status: ACTIVE_ASSIGNMENT },
  include: [{ model: Mentor, as: 'mentor', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] }],
};
const founderInclude = { model: User, as: 'founder', attributes: ['id', 'name', 'email'] };

/** Team member fields from a request body; a blank email is stored as null. */
const memberFields = (body) => {
  const out = pick(body, ['name', 'email', 'role']);
  if (out.name !== undefined) out.name = String(out.name).trim();
  if (out.email !== undefined) out.email = String(out.email || '').trim() || null;
  return out;
};

router.get('/', async (req, res) => {
  const where = {};
  const ids = await visibleStartupIds(req);
  if (ids) where.id = ids;
  if (req.query.status) where.status = req.query.status;
  if (req.query.industry) where.industry = req.query.industry;
  if (req.query.search) where.startupName = { [likeOp]: `%${req.query.search}%` };
  const startups = await Startup.findAll({ where, include: [founderInclude, mentorInclude], order: [['createdAt', 'DESC']] });
  const finance = await financeSummary(startups.map((s) => s.id));
  const investor = await investorFor(req);
  const mine = investor
    ? await InvestmentInterest.findAll({ where: { investorId: investor.id, startupId: startups.map((s) => s.id) }, order: [['createdAt', 'DESC']] })
    : [];
  res.json(startups.map((s) => withInvestorView(req, {
    ...s.toJSON(),
    finance: finance[s.id],
    myInterest: investor ? mine.find((i) => i.startupId === s.id) || null : undefined,
  })));
});

/** Investors get a public profile only: internal admin remarks stay hidden. */
function withInvestorView(req, json) {
  if (req.role === 'investor') delete json.adminRemarks;
  return json;
}

router.post('/', authorize('student'), async (req, res) => {
  requireFields(req.body, ['startupName', 'industry']);
  const startup = await sequelize.transaction(async (transaction) => {
    const s = await Startup.create({ ...pick(req.body, EDITABLE), createdById: req.user.id, status: 'draft' }, { transaction });
    const members = Array.isArray(req.body.members) ? req.body.members.filter((m) => String(m?.name || '').trim()) : [];
    if (members.length) await StartupMember.bulkCreate(members.map((m) => ({ ...memberFields(m), startupId: s.id })), { transaction, validate: true });
    return s;
  });
  res.status(201).json(startup);
});

router.get('/:id', async (req, res) => {
  const { id } = await loadStartup(req, req.params.id, { investorView: true });
  const startup = await Startup.findByPk(id, {
    include: [
      founderInclude, mentorInclude,
      { model: StartupMember, as: 'members' },
      { model: Milestone, as: 'milestones' },
    ],
    order: [[{ model: Milestone, as: 'milestones' }, 'order', 'ASC']],
  });
  // Link team members to their platform accounts (matched by email) so their profiles can be opened.
  const json = startup.toJSON();
  const emails = json.members.map((m) => m.email).filter(Boolean);
  const accounts = emails.length ? await User.findAll({ where: { email: emails, status: 'active' }, attributes: ['id', 'email'] }) : [];
  json.members = json.members.map((m) => ({ ...m, userId: accounts.find((u) => u.email === m.email)?.id ?? null }));
  res.json(withInvestorView(req, { ...json, finance: await financeSummary(id) }));
});

router.put('/:id', authorize('student', 'admin'), async (req, res) => {
  const startup = await loadStartup(req, req.params.id, { ownerOnly: true });
  await startup.update(pick(req.body, EDITABLE));
  res.json(startup);
});

router.delete('/:id', authorize('student', 'admin'), async (req, res) => {
  const startup = await loadStartup(req, req.params.id, { ownerOnly: true });
  if (req.role === 'student' && !['draft', 'pending', 'rejected'].includes(startup.status)) {
    throw new HttpError(400, 'Approved or incubated startups can only be removed by the incubation manager');
  }
  const docs = await Document.findAll({ where: { startupId: startup.id }, attributes: ['filePath'] });
  await startup.destroy();
  docs.forEach((d) => removeFile(d.filePath));
  res.json({ message: 'Startup deleted' });
});

router.post('/:id/submit', authorize('student'), async (req, res) => {
  const startup = await loadStartup(req, req.params.id, { ownerOnly: true });
  if (!['draft', 'rejected'].includes(startup.status)) throw new HttpError(400, `A ${startup.status} startup cannot be submitted again`);
  const missing = REQUIRED_FOR_SUBMISSION.filter((f) => !String(startup[f] ?? '').trim());
  if (missing.length) throw new HttpError(400, `Please complete these fields before submitting: ${missing.join(', ')}`);
  await startup.update({ status: 'pending', submittedAt: new Date(), adminRemarks: null });
  await notify(await adminIds(), { message: `New startup submitted for verification: ${startup.startupName}`, type: 'startup', link: `/startups/${startup.id}` });
  res.json(startup);
});

// Admin verification workflow.
const TRANSITIONS = { pending: ['approved', 'rejected'], approved: ['incubated', 'rejected'], incubated: [], rejected: [], draft: [] };

router.patch('/:id/status', authorize('admin'), async (req, res) => {
  requireFields(req.body, ['status']);
  const startup = await loadStartup(req, req.params.id);
  const next = req.body.status;
  if (!TRANSITIONS[startup.status]?.includes(next)) throw new HttpError(400, `Cannot change status from ${startup.status} to ${next}`);
  if (next === 'rejected' && !String(req.body.remarks || '').trim()) throw new HttpError(400, 'Please give a reason for rejection');
  if (next === 'incubated' && !(await financeSummary(startup.id)).financed) {
    throw new HttpError(400, 'A startup can be incubated only after it secures finance: an investor deal accepted by the founder and cleared by the Incubation Cell');
  }

  await sequelize.transaction(async (transaction) => {
    await startup.update({ status: next, adminRemarks: req.body.remarks || null }, { transaction });
    if (next === 'approved' && !(await Milestone.count({ where: { startupId: startup.id }, transaction }))) {
      await Milestone.bulkCreate(DEFAULT_MILESTONES.map((m, i) => ({ ...m, order: i + 1, startupId: startup.id })), { transaction });
    }
  });
  await recalcProgress(startup.id);

  // A rejected startup leaves the investor marketplace: close open offers and investor meetings.
  if (next === 'rejected') {
    const reason = 'Closed automatically: the startup is no longer in the incubation programme.';
    const investorUsers = new Set();
    for (const o of await InvestmentInterest.findAll({ where: { startupId: startup.id, status: 'pending' }, include: [{ model: Investor, as: 'investor' }] })) {
      await o.update({ status: 'declined', founderNote: reason, respondedAt: new Date() });
      investorUsers.add(o.investor.userId);
    }
    for (const m of await InvestorMeeting.findAll({ where: { startupId: startup.id, status: ['pending', 'accepted'] }, include: [{ model: Investor, as: 'investor' }] })) {
      await m.update({ status: 'cancelled', awaiting: null, note: reason });
      investorUsers.add(m.investor.userId);
    }
    if (investorUsers.size) {
      await notify([...investorUsers], { message: `${startup.startupName} is no longer open to investment; your open offers and meetings with them were closed.`, type: 'investment', link: '/investor/deals' }, { email: false });
    }
  }

  const verb = { approved: 'approved 🎉', rejected: 'rejected', incubated: 'accepted into incubation 🚀' }[next];
  const remark = req.body.remarks ? ` Remarks: ${req.body.remarks}` : '';
  await notify([startup.createdById, ...(await mentorUserIdsForStartup(startup.id))], {
    message: `Startup "${startup.startupName}" has been ${verb}.${remark}`, type: 'startup', link: `/startups/${startup.id}`,
  });
  res.json(await startup.reload());
});

// ---------- Team members (StartupMember) ----------
router.post('/:id/members', authorize('student', 'admin'), async (req, res) => {
  const startup = await loadStartup(req, req.params.id, { ownerOnly: true });
  requireFields(req.body, ['name']);
  res.status(201).json(await StartupMember.create({ ...memberFields(req.body), startupId: startup.id }));
});

router.put('/:id/members/:memberId', authorize('student', 'admin'), async (req, res) => {
  const startup = await loadStartup(req, req.params.id, { ownerOnly: true });
  const member = await StartupMember.findOne({ where: { id: req.params.memberId, startupId: startup.id } });
  if (!member) throw new HttpError(404, 'Team member not found');
  res.json(await member.update(memberFields(req.body)));
});

router.delete('/:id/members/:memberId', authorize('student', 'admin'), async (req, res) => {
  const startup = await loadStartup(req, req.params.id, { ownerOnly: true });
  const deleted = await StartupMember.destroy({ where: { id: req.params.memberId, startupId: startup.id } });
  if (!deleted) throw new HttpError(404, 'Team member not found');
  res.json({ message: 'Member removed' });
});

export default router;
