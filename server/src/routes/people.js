/**
 * Public people profiles — any signed-in user can open anyone's profile to learn about their
 * background, work and achievements. Private data (phone, drafts, pending offers) is only shown
 * to the person themself and to admins.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import {
  User, Role, Mentor, Investor, Startup, StartupMember, MentorAssignment, Milestone, Feedback, Meeting,
  InvestmentInterest, InvestorMeeting, Workshop, WorkshopRegistration,
} from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { visibleStartupIds, financeSummary, INVESTABLE } from '../services/access.js';
import { HttpError } from '../utils/http.js';

const router = Router();
router.use(authenticate);

const splitList = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
/** Compact INR for headlines: ₹40K, ₹12L, ₹1.5Cr. */
const inr = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${+(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${+(v / 1e5).toFixed(2)}L`;
  if (v >= 1e3) return `₹${+(v / 1e3).toFixed(1)}K`;
  return `₹${v}`;
};

/** Startups shown on someone else's profile: only verified ones (no drafts / pending / rejected). */
const PUBLIC_STATUSES = INVESTABLE;

async function workshopHistory(userId) {
  const regs = await WorkshopRegistration.findAll({
    where: { userId, attendanceStatus: 'present' },
    include: [{ model: Workshop, as: 'workshop', attributes: ['id', 'title', 'type', 'date'] }],
    order: [[{ model: Workshop, as: 'workshop' }, 'date', 'DESC']],
  });
  return regs.map((r) => ({ id: r.workshop.id, title: r.workshop.title, type: r.workshop.type, date: r.workshop.date }));
}

function startupCard(s, finance, canOpen) {
  return {
    id: s.id, startupName: s.startupName, industry: s.industry, status: s.status, progress: s.progress,
    rating: s.rating, description: s.description, finance: finance?.[s.id], canOpen: canOpen(s.id),
  };
}

async function founderReport(user, isPrivate, canOpen) {
  const owned = await Startup.findAll({ where: { createdById: user.id }, order: [['createdAt', 'DESC']] });
  const shown = isPrivate ? owned : owned.filter((s) => PUBLIC_STATUSES.includes(s.status));
  const memberships = await StartupMember.findAll({
    where: { email: user.email },
    include: [{ model: Startup, as: 'startup', where: { createdById: { [Op.ne]: user.id }, status: PUBLIC_STATUSES } }],
  });
  const ids = shown.map((s) => s.id);
  const [finance, milestonesCompleted, certificates] = await Promise.all([
    financeSummary(ids),
    Milestone.count({ where: { startupId: ids, status: 'completed' } }),
    workshopHistory(user.id),
  ]);
  const raised = Object.values(finance).reduce((t, f) => t + f.total, 0);
  const incubated = shown.filter((s) => s.status === 'incubated').length;
  const rated = shown.filter((s) => s.rating > 0);

  const achievements = [];
  if (shown.length) achievements.push({ icon: 'rocket', title: `Founded ${shown.length} startup${shown.length > 1 ? 's' : ''}`, detail: shown.map((s) => s.startupName).join(', ') });
  if (incubated) achievements.push({ icon: 'sprout', title: 'Incubated founder', detail: `${incubated} startup${incubated > 1 ? 's' : ''} accepted into incubation` });
  if (raised) achievements.push({ icon: 'landmark', title: `Raised ${inr(raised)}`, detail: 'Investor deals cleared by the StartIn team' });
  if (milestonesCompleted) achievements.push({ icon: 'target', title: `${milestonesCompleted} milestone${milestonesCompleted > 1 ? 's' : ''} completed`, detail: 'Approved by mentors' });
  if (certificates.length) achievements.push({ icon: 'award', title: `${certificates.length} certificate${certificates.length > 1 ? 's' : ''} earned`, detail: certificates.map((c) => c.title).join(', ') });

  return {
    stats: [
      { label: 'Startups founded', value: shown.length },
      { label: 'Finance raised', value: raised, money: true },
      { label: 'Milestones completed', value: milestonesCompleted },
      { label: 'Avg. mentor rating', value: rated.length ? Math.round((rated.reduce((t, s) => t + s.rating, 0) / rated.length) * 10) / 10 : '—' },
    ],
    startups: shown.map((s) => startupCard(s, finance, canOpen)),
    memberOf: memberships.map((m) => ({ role: m.role, ...startupCard(m.startup, null, canOpen) })),
    certificates,
    achievements,
  };
}

async function mentorReport(user, canOpen) {
  const mentor = await Mentor.findOne({ where: { userId: user.id } });
  if (!mentor) return { stats: [], achievements: [] };
  const assignments = await MentorAssignment.findAll({
    where: { mentorId: mentor.id },
    include: [{ model: Startup, as: 'startup' }],
    order: [['assignedDate', 'DESC']],
  });
  const ids = [...new Set(assignments.map((a) => a.startupId))];
  const [feedbackCount, meetingsCompleted, milestonesGuided] = await Promise.all([
    Feedback.count({ where: { mentorId: mentor.id } }),
    Meeting.count({ where: { mentorId: mentor.id, status: 'completed' } }),
    Milestone.count({ where: { startupId: assignments.filter((a) => a.status !== 'removed').map((a) => a.startupId), status: 'completed' } }),
  ]);
  const active = assignments.filter((a) => a.status !== 'removed');
  const incubated = active.filter((a) => a.startup.status === 'incubated').length;

  const achievements = [];
  if (ids.length) achievements.push({ icon: 'users', title: `Mentored ${ids.length} startup${ids.length > 1 ? 's' : ''}`, detail: [...new Set(assignments.map((a) => a.startup.startupName))].join(', ') });
  if (incubated) achievements.push({ icon: 'sprout', title: `Guided ${incubated} startup${incubated > 1 ? 's' : ''} into incubation`, detail: 'Currently incubated mentees' });
  if (milestonesGuided) achievements.push({ icon: 'target', title: `${milestonesGuided} milestones achieved by mentees`, detail: 'Across current mentorships' });
  if (feedbackCount) achievements.push({ icon: 'message', title: `${feedbackCount} feedback session${feedbackCount > 1 ? 's' : ''}`, detail: 'Written suggestions shared with founders' });
  if (meetingsCompleted) achievements.push({ icon: 'calendar', title: `${meetingsCompleted} mentoring meeting${meetingsCompleted > 1 ? 's' : ''} held`, detail: '' });

  return {
    mentor: { expertise: splitList(mentor.expertise), bio: mentor.bio, availability: mentor.availability },
    stats: [
      { label: 'Startups mentored', value: ids.length },
      { label: 'Active mentorships', value: active.length },
      { label: 'Feedback given', value: feedbackCount },
      { label: 'Meetings held', value: meetingsCompleted },
    ],
    mentorships: assignments.map((a) => ({ status: a.status, since: a.assignedDate, ...startupCard(a.startup, null, canOpen) })),
    achievements,
  };
}

async function investorReport(user, isPrivate, canOpen) {
  const investor = await Investor.findOne({ where: { userId: user.id } });
  if (!investor) return { stats: [], achievements: [] };
  const offers = await InvestmentInterest.findAll({
    where: { investorId: investor.id },
    include: [{ model: Startup, as: 'startup' }],
    order: [['createdAt', 'DESC']],
  });
  const deals = offers.filter((o) => o.status === 'accepted' && o.clearance === 'cleared');
  const meetingsHeld = await InvestorMeeting.count({ where: { investorId: investor.id, status: 'completed' } });
  const committed = deals.reduce((t, o) => t + Number(o.amount), 0);
  const backedIncubated = new Set(deals.filter((d) => d.startup.status === 'incubated').map((d) => d.startupId)).size;
  const industries = [...new Set(deals.map((d) => d.startup.industry))];

  const achievements = [];
  if (deals.length) achievements.push({ icon: 'handshake', title: `${deals.length} investment${deals.length > 1 ? 's' : ''} closed`, detail: deals.map((d) => d.startup.startupName).join(', ') });
  if (committed) achievements.push({ icon: 'landmark', title: `${inr(committed)} committed`, detail: industries.length ? `Across ${industries.join(', ')}` : '' });
  if (backedIncubated) achievements.push({ icon: 'sprout', title: `Backed ${backedIncubated} incubated startup${backedIncubated > 1 ? 's' : ''}`, detail: 'Their finance helped these startups enter incubation' });

  return {
    investor: {
      id: investor.id, firmName: investor.firmName, investorType: investor.investorType, focusIndustries: splitList(investor.focusIndustries),
      ticketMin: investor.ticketMin, ticketMax: investor.ticketMax, bio: investor.bio, website: investor.website,
    },
    stats: [
      { label: 'Investments', value: deals.length },
      { label: 'Committed', value: committed, money: true },
      { label: 'Startups backed', value: new Set(deals.map((d) => d.startupId)).size },
      { label: 'Founder meetings', value: meetingsHeld },
    ],
    portfolio: deals.map((d) => ({
      amount: d.amount, equity: d.equity, instrument: d.instrument, date: d.respondedAt || d.createdAt, ...startupCard(d.startup, null, canOpen),
    })),
    // Pending offers are private negotiations — only the investor and admins see them.
    openOffers: isPrivate ? offers.filter((o) => o.status === 'pending').map((o) => ({ amount: o.amount, instrument: o.instrument, ...startupCard(o.startup, null, canOpen) })) : undefined,
    achievements,
  };
}

async function adminReport(user) {
  const [workshops, incubated, startups] = await Promise.all([
    Workshop.count({ where: { createdById: user.id } }),
    Startup.count({ where: { status: 'incubated' } }),
    Startup.count({ where: { status: { [Op.ne]: 'draft' } } }),
  ]);
  return {
    stats: [
      { label: 'Workshops organised', value: workshops },
      { label: 'Startups in the programme', value: startups },
      { label: 'Active incubations', value: incubated },
    ],
    achievements: workshops ? [{ icon: 'award', title: `Organised ${workshops} event${workshops > 1 ? 's' : ''}`, detail: 'Workshops, hackathons and training sessions' }] : [],
  };
}

router.get('/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id, { include: [{ model: Role, as: 'role' }] });
  if (!user || (user.status !== 'active' && req.role !== 'admin')) throw new HttpError(404, 'Profile not found');
  const isSelf = user.id === req.user.id;
  const isPrivate = isSelf || req.role === 'admin';

  const visible = await visibleStartupIds(req);
  const canOpen = (startupId) => visible === null || visible.includes(startupId);

  const role = user.role.roleName;
  const report = role === 'student' ? await founderReport(user, isPrivate, canOpen)
    : role === 'mentor' ? await mentorReport(user, canOpen)
      : role === 'investor' ? await investorReport(user, isPrivate, canOpen)
        : await adminReport(user);

  res.json({
    person: {
      id: user.id, name: user.name, role, email: user.email, joinedAt: user.createdAt,
      headline: user.headline, about: user.about, skills: splitList(user.skills), linkedin: user.linkedin, website: user.website,
      ...(isPrivate && { phone: user.phone, status: user.status }),
    },
    isSelf,
    ...report,
  });
});

export default router;
