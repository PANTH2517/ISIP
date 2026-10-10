/**
 * Investor module — funding happens only between founders and investors.
 * Investors browse approved startups (via /api/startups), make offers and request meetings; founders pitch from
 * the investor directory and accept/decline offers. An accepted offer is a transaction the Incubation Cell reviews:
 * it can clear it, put it on hold or cancel it. Only a cleared deal counts as secured finance and moves an
 * approved startup into incubation.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { Investor, InvestmentInterest, InvestorMeeting, Startup, User, Document, INSTRUMENTS, MEETING_KINDS } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { loadStartup, investorFor, incubateIfFinanced, INVESTABLE } from '../services/access.js';
import { notify, adminIds, mentorUserIdsForStartup } from '../services/notify.js';
import { HttpError, requireFields, validateSlot, today, humanSlot, parseAmount } from '../utils/http.js';
import { sweepFirst, checkInWindowError, slotStart, findClash } from '../services/meetingLifecycle.js';

const router = Router();
router.use(authenticate);

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const investorInclude = { model: Investor, as: 'investor', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] };
const startupInclude = { model: Startup, as: 'startup', attributes: ['id', 'startupName', 'industry', 'status', 'createdById', 'progress'] };

/** Rows visible to the caller: investors see their own, founders see their startups', admins see all. */
async function scope(req) {
  if (req.role === 'admin') return {};
  if (req.role === 'investor') return { investorId: (await investorFor(req))?.id ?? -1 };
  if (req.role === 'student') {
    return { startupId: (await Startup.findAll({ where: { createdById: req.user.id }, attributes: ['id'] })).map((s) => s.id) };
  }
  throw new HttpError(403, 'You do not have permission to perform this action');
}

const label = (inv) => (inv.firmName ? `${inv.user.name} (${inv.firmName})` : inv.user.name);

// ---------- Investor directory (admin) ----------
router.get('/', authorize('admin'), async (req, res) => {
  const investors = await Investor.findAll({
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'status'] },
      { model: InvestmentInterest, as: 'interests', attributes: ['id', 'status', 'amount', 'clearance'] },
    ],
    order: [[{ model: User, as: 'user' }, 'name', 'ASC']],
  });
  res.json(investors.map((i) => {
    const json = i.toJSON();
    const accepted = json.interests.filter((x) => x.status === 'accepted' && x.clearance === 'cleared');
    return { ...json, interests: undefined, offers: json.interests.length, deals: accepted.length, committed: accepted.reduce((s, x) => s + Number(x.amount), 0) };
  }));
});

// ---------- Investment interests ----------
router.get('/interests', async (req, res) => {
  const where = await scope(req);
  if (req.query.startupId) where.startupId = req.query.startupId;
  if (req.query.status) where.status = req.query.status;
  if (req.query.clearance) where.clearance = String(req.query.clearance).split(',');
  res.json(await InvestmentInterest.findAll({ where, include: [investorInclude, startupInclude], order: [['createdAt', 'DESC']] }));
});

router.post('/interests', authorize('investor'), async (req, res) => {
  requireFields(req.body, ['startupId', 'amount']);
  const investor = await investorFor(req);
  const startup = await loadStartup(req, req.body.startupId, { investorView: true });
  const amount = parseAmount(req.body.amount);
  const equity = req.body.equity === '' || req.body.equity == null ? null : Number(req.body.equity);
  if (equity !== null && !(equity > 0 && equity <= 100)) throw new HttpError(400, 'Equity must be between 0 and 100%');
  const instrument = req.body.instrument || 'Equity';
  if (!INSTRUMENTS.includes(instrument)) throw new HttpError(400, 'Invalid instrument');
  if (await InvestmentInterest.findOne({ where: { investorId: investor.id, startupId: startup.id, status: 'pending' } })) {
    throw new HttpError(409, 'You already have a pending offer for this startup. Withdraw it to make a new one.');
  }
  const interest = await InvestmentInterest.create({ investorId: investor.id, startupId: startup.id, amount, equity, instrument, message: req.body.message });
  const who = investor.firmName ? `${req.user.name} (${investor.firmName})` : req.user.name;
  await notify(startup.createdById, {
    message: `💼 ${who} is interested in investing ${inr(amount)} in ${startup.startupName}${equity ? ` for ${equity}% equity` : ''}. Review the offer.`,
    type: 'investment', link: `/startups/${startup.id}?tab=investors`,
  });
  await notify(await adminIds(), { message: `${who} made an offer of ${inr(amount)} to ${startup.startupName}`, type: 'investment', link: '/funding' }, { email: false });
  res.status(201).json(interest);
});

router.patch('/interests/:id/withdraw', authorize('investor'), async (req, res) => {
  const investor = await investorFor(req);
  const interest = await InvestmentInterest.findOne({ where: { id: req.params.id, investorId: investor.id }, include: [startupInclude] });
  if (!interest) throw new HttpError(404, 'Offer not found');
  if (interest.status !== 'pending') throw new HttpError(400, `This offer is already ${interest.status}`);
  await interest.update({ status: 'withdrawn' });
  await notify(interest.startup.createdById, { message: `An investment offer for ${interest.startup.startupName} was withdrawn.`, type: 'investment', link: `/startups/${interest.startupId}?tab=investors` }, { email: false });
  res.json(interest);
});

router.patch('/interests/:id/respond', authorize('student'), async (req, res) => {
  const { decision, note } = req.body;
  if (!['accepted', 'declined'].includes(decision)) throw new HttpError(400, 'Decision must be accepted or declined');
  const interest = await InvestmentInterest.findByPk(req.params.id, { include: [investorInclude, startupInclude] });
  if (!interest) throw new HttpError(404, 'Offer not found');
  const startup = await loadStartup(req, interest.startupId, { ownerOnly: true });
  if (interest.status !== 'pending') throw new HttpError(400, `This offer is already ${interest.status}`);
  if (decision === 'accepted' && !INVESTABLE.includes(startup.status)) throw new HttpError(400, 'Only approved startups can accept investment');
  // An accepted offer becomes a transaction awaiting the Incubation Cell's clearance.
  await interest.update({ status: decision, founderNote: note || null, respondedAt: new Date(), clearance: decision === 'accepted' ? 'under_review' : null });

  const verb = decision === 'accepted' ? 'accepted 🎉 It is now with the Incubation Cell for clearance' : 'declined';
  await notify(interest.investor.userId, {
    message: `${startup.startupName} ${verb} your offer of ${inr(interest.amount)}.${note ? ` Note: ${note}` : ''}`, type: 'investment', link: '/investor/deals',
  });
  if (decision === 'accepted') {
    await notify(await adminIds(), {
      message: `Transaction to review: ${startup.startupName} accepted ${inr(interest.amount)} from ${label(interest.investor)}.`, type: 'investment', link: '/funding',
    });
  }
  res.json({ interest });
});

// ---------- Incubation Cell review of accepted deals ----------
const CLEARANCE_ACTIONS = { clear: 'cleared', hold: 'on_hold', cancel: 'cancelled' };

router.patch('/interests/:id/clearance', authorize('admin'), async (req, res) => {
  const next = CLEARANCE_ACTIONS[req.body.action];
  if (!next) throw new HttpError(400, 'Action must be clear, hold or cancel');
  const note = String(req.body.note || '').trim();
  if (next !== 'cleared' && !note) throw new HttpError(400, `Please add a reason for ${next === 'on_hold' ? 'putting the transaction on hold' : 'cancelling the transaction'}`);
  const interest = await InvestmentInterest.findByPk(req.params.id, { include: [investorInclude, startupInclude] });
  if (!interest || interest.status !== 'accepted') throw new HttpError(404, 'Transaction not found');
  if (!['under_review', 'on_hold'].includes(interest.clearance)) throw new HttpError(400, `This transaction is already ${interest.clearance}`);
  if (next === interest.clearance) throw new HttpError(400, 'This transaction is already on hold');
  await interest.update({ clearance: next, clearanceNote: note || null, reviewedAt: new Date() });

  const deal = `${inr(interest.amount)} from ${label(interest.investor)} to ${interest.startup.startupName}`;
  const message = {
    cleared: `✅ Transaction cleared: ${deal}.`,
    on_hold: `⏸ Transaction on hold: ${deal}. Reason: ${note}`,
    cancelled: `Transaction cancelled: ${deal}. Reason: ${note}`,
  }[next];
  await notify([interest.startup.createdById], { message, type: 'investment', link: `/startups/${interest.startupId}?tab=investors` });
  await notify([interest.investor.userId], { message, type: 'investment', link: '/investor/deals' });
  if (next === 'cleared') await notify(await mentorUserIdsForStartup(interest.startupId), { message, type: 'investment', link: `/startups/${interest.startupId}` }, { email: false });
  // A cleared deal is secured finance, which moves an approved startup into incubation.
  const incubated = next === 'cleared' ? await incubateIfFinanced(interest.startupId, `${inr(interest.amount)} from ${label(interest.investor)}`) : false;
  res.json({ interest, incubated });
});

// ---------- Investor ↔ founder meetings ----------
// Either side can propose a meeting (founders pitch for funding; investors ask for intros / diligence).
// `awaiting` says whose confirmation is needed; any new time proposed by one side must be confirmed by the other.
const deckInclude = { model: Document, as: 'deck', attributes: ['id', 'fileName', 'version', 'fileType'] };
const meetingIncludes = [investorInclude, startupInclude, deckInclude];
/** 409 if the investor or the startup already has a confirmed meeting overlapping this slot. */
async function assertFree({ investorId, startupId, date, time, excludeId }) {
  const sameDay = await InvestorMeeting.findAll({ where: { date, status: 'accepted', [Op.or]: [{ investorId }, { startupId }] }, include: [investorInclude, startupInclude] });
  const clash = findClash(sameDay, time, excludeId);
  if (clash) {
    const who = clash.investorId === investorId ? clash.investor.user.name : clash.startup.startupName;
    throw new HttpError(409, `${who} already has a confirmed meeting at ${humanSlot(clash.date, clash.time)}. Please pick another time.`);
  }
}

/** "a pitch meeting", "an intro call" */
const withArticle = (phrase) => `${/^[aeiou]/i.test(phrase) ? 'an' : 'a'} ${phrase}`;
const KIND_LABEL = { pitch: 'pitch meeting', intro: 'intro call', due_diligence: 'due-diligence meeting', follow_up: 'follow-up meeting' };

router.get('/meetings', sweepFirst, async (req, res) => {
  const where = await scope(req);
  if (req.query.startupId) where.startupId = req.query.startupId;
  if (req.query.upcoming === 'true') {
    where.date = { [Op.gte]: today() };
    where.status = ['pending', 'accepted'];
  }
  res.json(await InvestorMeeting.findAll({ where, include: meetingIncludes, order: [['date', 'ASC'], ['time', 'ASC']] }));
});

router.post('/meetings', authorize('investor', 'student'), async (req, res) => {
  requireFields(req.body, ['startupId', 'date', 'time']);
  validateSlot(req.body.date, req.body.time);
  const kind = req.body.kind || (req.role === 'student' ? 'pitch' : 'intro');
  if (!MEETING_KINDS.includes(kind)) throw new HttpError(400, 'Invalid meeting type');
  const base = { date: req.body.date, time: req.body.time, agenda: req.body.agenda, kind, location: String(req.body.location || '').trim() || null };

  if (req.role === 'investor') {
    const investor = await investorFor(req);
    const startup = await loadStartup(req, req.body.startupId, { investorView: true });
    const meeting = await InvestorMeeting.create({ ...base, investorId: investor.id, startupId: startup.id, awaiting: 'founder' });
    await notify(startup.createdById, {
      message: `${req.user.name}${investor.firmName ? ` (${investor.firmName})` : ''} requested ${withArticle(KIND_LABEL[kind])} on ${humanSlot(meeting.date, meeting.time)}. Please confirm.`,
      type: 'investment', link: '/meetings',
    });
    return res.status(201).json(meeting);
  }

  // Founder → investor pitch request.
  requireFields(req.body, ['investorId']);
  const startup = await loadStartup(req, req.body.startupId, { ownerOnly: true });
  if (!INVESTABLE.includes(startup.status)) throw new HttpError(400, 'Your startup must be approved before you can pitch to investors');
  const investor = await Investor.findByPk(req.body.investorId, { include: [{ model: User, as: 'user', attributes: ['id', 'name', 'status'] }] });
  if (!investor || investor.user.status !== 'active') throw new HttpError(404, 'Investor not found');
  let askAmount = null;
  if (req.body.askAmount !== undefined && req.body.askAmount !== '' && req.body.askAmount !== null) {
    askAmount = parseAmount(req.body.askAmount, 'Funding ask');
  }
  let deckId = null;
  if (req.body.deckId) {
    if (!(await Document.count({ where: { id: req.body.deckId, startupId: startup.id } }))) throw new HttpError(400, 'Selected pitch deck does not belong to this startup');
    deckId = req.body.deckId;
  }
  const open = await InvestorMeeting.count({ where: { investorId: investor.id, startupId: startup.id, status: 'pending' } });
  if (open) throw new HttpError(409, `You already have a pending meeting request with ${investor.user.name}`);
  const meeting = await InvestorMeeting.create({ ...base, investorId: investor.id, startupId: startup.id, awaiting: 'investor', askAmount, deckId });
  await notify(investor.userId, {
    message: `🎤 ${startup.startupName} requested ${withArticle(KIND_LABEL[kind])} on ${humanSlot(meeting.date, meeting.time)}${askAmount ? `, raising ${inr(askAmount)}` : ''}. Please confirm.`,
    type: 'investment', link: '/meetings',
  });
  res.status(201).json(meeting);
});

router.patch('/meetings/:id', authorize('student', 'investor', 'admin'), sweepFirst, async (req, res) => {
  const { action, date, time, note } = req.body;
  const meeting = await InvestorMeeting.findByPk(req.params.id, { include: meetingIncludes });
  if (!meeting) throw new HttpError(404, 'Meeting not found');
  const isFounder = req.role === 'student' && meeting.startup.createdById === req.user.id;
  const isInvestor = req.role === 'investor' && meeting.investorId === (await investorFor(req))?.id;
  if (!isFounder && !isInvestor && req.role !== 'admin') throw new HttpError(403, 'You are not part of this meeting');

  const me = isFounder ? 'founder' : isInvestor ? 'investor' : null;
  const awaiting = meeting.awaiting || 'founder'; // meetings created before `awaiting` existed were investor-initiated
  const pending = meeting.status === 'pending';
  const open = ['pending', 'accepted'].includes(meeting.status);
  const started = Date.now() >= slotStart(meeting.date, meeting.time).getTime();
  if (action === 'checkin' && me && meeting.status === 'accepted') {
    const err = checkInWindowError(meeting.date, meeting.time);
    if (err) throw new HttpError(400, err);
    if (!meeting.checkedInAt) await meeting.update({ checkedInAt: new Date() });
  } else if ((action === 'accept' || action === 'reject') && pending && me === awaiting) {
    if (action === 'accept') await assertFree({ investorId: meeting.investorId, startupId: meeting.startupId, date: meeting.date, time: meeting.time, excludeId: meeting.id });
    await meeting.update({ status: action === 'accept' ? 'accepted' : 'rejected', awaiting: null, note: note ?? meeting.note });
  } else if ((action === 'accept' || action === 'reject') && pending) {
    throw new HttpError(400, `Waiting for the ${awaiting} to confirm this meeting`);
  } else if (action === 'reschedule' && me && open && !meeting.checkedInAt) {
    validateSlot(date, time);
    await assertFree({ investorId: meeting.investorId, startupId: meeting.startupId, date, time, excludeId: meeting.id });
    // A new time proposed by one side must be confirmed by the other.
    await meeting.update({ date, time, status: 'pending', awaiting: me === 'founder' ? 'investor' : 'founder', note: note ?? meeting.note });
  } else if (action === 'cancel' && open) {
    await meeting.update({ status: 'cancelled', awaiting: null, note: note ?? meeting.note });
  } else if (action === 'complete' && meeting.status === 'accepted') {
    if (!started) throw new HttpError(400, "A meeting can't be completed before it starts");
    await meeting.update({ status: 'completed', note: note ?? meeting.note });
  } else {
    throw new HttpError(400, `Cannot ${action || 'update'} ${withArticle(meeting.status)} meeting`);
  }
  const other = isFounder ? meeting.investor.userId : meeting.startup.createdById;
  const label = KIND_LABEL[meeting.kind] || 'investor meeting';
  const text = { accept: 'confirmed', reject: 'declined', reschedule: `moved to ${humanSlot(date, time)}. Please confirm the new time`, cancel: 'cancelled', complete: 'marked as completed' }[action];
  const message = action === 'checkin'
    ? `${req.user.name} checked in to the ${label} for ${meeting.startup.startupName}. Join now.`
    : `The ${label} (${meeting.startup.startupName} · ${meeting.investor.user.name}) was ${text} by ${req.user.name}.`;
  await notify(other, { message, type: 'investment', link: '/meetings' }, { email: action !== 'checkin' });
  res.json(meeting);
});

// ---------- Investor directory (for founders choosing whom to pitch) ----------
router.get('/directory', authorize('student', 'mentor', 'admin'), async (req, res) => {
  const investors = await Investor.findAll({
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'headline', 'status'], where: { status: 'active' } },
      { model: InvestmentInterest, as: 'interests', attributes: ['status', 'amount'] },
    ],
    order: [[{ model: User, as: 'user' }, 'name', 'ASC']],
  });
  res.json(investors.map((i) => {
    const deals = i.interests.filter((x) => x.status === 'accepted');
    return {
      id: i.id, userId: i.user.id, name: i.user.name, headline: i.user.headline, firmName: i.firmName, investorType: i.investorType,
      focusIndustries: String(i.focusIndustries || '').split(',').map((s) => s.trim()).filter(Boolean),
      ticketMin: i.ticketMin, ticketMax: i.ticketMax, bio: i.bio, deals: deals.length,
    };
  }));
});

export default router;
