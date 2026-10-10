/** Role-specific dashboards (Student / Mentor / Admin / Investor) as described in the project details. */
import { Router } from 'express';
import { Op } from 'sequelize';
import {
  Startup, User, Mentor, MentorAssignment, Milestone, MilestoneUpdate, Meeting, MeetingRequest, Notification, AuditLog,
  Investor, InvestmentInterest, InvestorMeeting,
} from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { mentorFor, investorFor, financeSummary, ACTIVE_ASSIGNMENT, INVESTABLE } from '../services/access.js';
import { summary } from '../services/stats.js';
import { sweepFirst } from '../services/meetingLifecycle.js';
import { today } from '../utils/http.js';

const router = Router();
router.use(authenticate, sweepFirst);

const mentorUser = { model: Mentor, as: 'mentor', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] };
const startupRef = { model: Startup, as: 'startup', attributes: ['id', 'startupName'] };
const investorUser = { model: Investor, as: 'investor', include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] };

async function notificationsFor(userId) {
  const [latest, unread] = await Promise.all([
    Notification.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 5 }),
    Notification.count({ where: { userId, isRead: false } }),
  ]);
  return { latest, unread };
}

async function studentDashboard(req) {
  const startups = await Startup.findAll({
    where: { createdById: req.user.id },
    include: [
      { model: MentorAssignment, as: 'assignments', required: false, where: { status: ACTIVE_ASSIGNMENT }, include: [mentorUser] },
      { model: Milestone, as: 'milestones' },
    ],
    order: [['createdAt', 'DESC'], [{ model: Milestone, as: 'milestones' }, 'order', 'ASC']],
  });
  const ids = startups.map((s) => s.id);
  const [upcomingMeetings, pendingMeetingRequests, offers, investorMeetings, finance] = await Promise.all([
    Meeting.findAll({ where: { startupId: ids, status: 'scheduled', date: { [Op.gte]: today() } }, include: [startupRef, mentorUser], order: [['date', 'ASC'], ['time', 'ASC']], limit: 5 }),
    MeetingRequest.count({ where: { startupId: ids, status: 'pending' } }),
    InvestmentInterest.findAll({ where: { startupId: ids }, include: [startupRef, investorUser], order: [['createdAt', 'DESC']] }),
    InvestorMeeting.findAll({ where: { startupId: ids, status: ['pending', 'accepted'], date: { [Op.gte]: today() } }, include: [startupRef, investorUser], order: [['date', 'ASC']] }),
    financeSummary(ids),
  ]);

  const tasks = [];
  for (const s of startups) {
    if (s.status === 'draft') tasks.push({ text: `Complete and submit "${s.startupName}" for verification`, link: `/startups/${s.id}` });
    if (s.status === 'rejected') tasks.push({ text: `Revise and resubmit "${s.startupName}"`, link: `/startups/${s.id}` });
    if (['approved', 'incubated'].includes(s.status)) {
      const next = s.milestones.find((m) => m.status !== 'completed');
      if (next && next.status !== 'submitted') tasks.push({ text: `Submit progress for milestone "${next.name}" (${s.startupName})`, link: `/startups/${s.id}?tab=milestones` });
    }
  }
  for (const o of offers.filter((o) => o.status === 'pending')) {
    tasks.push({ text: `Respond to ₹${Number(o.amount).toLocaleString('en-IN')} offer from ${o.investor.user.name} (${o.startup.startupName})`, link: `/startups/${o.startupId}?tab=investors` });
  }
  for (const m of investorMeetings.filter((m) => m.status === 'pending' && (m.awaiting || 'founder') === 'founder')) {
    tasks.push({ text: `Confirm investor meeting with ${m.investor.user.name} on ${m.date}`, link: `/startups/${m.startupId}?tab=investors` });
  }
  for (const s of startups.filter((s) => s.status === 'approved')) {
    const f = finance[s.id];
    tasks.push(f?.awaitingDeals
      ? { text: `"${s.startupName}" has ${f.awaitingDeals === 1 ? 'a deal' : `${f.awaitingDeals} deals`} awaiting Incubation Cell clearance`, link: '/funding' }
      : { text: `Secure finance for "${s.startupName}" to enter incubation — pitch to investors or accept an offer`, link: '/investors' });
  }
  if (!startups.length) tasks.push({ text: 'Create your first startup profile', link: '/startups/new' });

  return {
    startups: startups.map((s) => ({ ...s.toJSON(), finance: finance[s.id] })),
    offers: {
      recent: offers.slice(0, 5),
      pending: offers.filter((o) => o.status === 'pending').length,
      committed: offers.filter((o) => o.status === 'accepted' && o.clearance === 'cleared').reduce((t, o) => t + Number(o.amount), 0),
      awaitingClearance: offers.filter((o) => o.status === 'accepted' && ['under_review', 'on_hold'].includes(o.clearance)).reduce((t, o) => t + Number(o.amount), 0),
    },
    investorMeetings,
    upcomingMeetings,
    pendingMeetingRequests,
    tasks,
  };
}

async function mentorDashboard(req) {
  const mentor = await mentorFor(req);
  const assignments = await MentorAssignment.findAll({
    where: { mentorId: mentor.id, status: ACTIVE_ASSIGNMENT },
    include: [{ model: Startup, as: 'startup', include: [{ model: User, as: 'founder', attributes: ['id', 'name'] }] }],
    order: [['assignedDate', 'DESC']],
  });
  const ids = assignments.map((a) => a.startupId);
  const [pendingReviews, meetingRequests, upcomingMeetings, completedMilestones] = await Promise.all([
    MilestoneUpdate.findAll({
      where: { status: 'submitted' },
      include: [{ model: Milestone, as: 'milestone', where: { startupId: ids }, include: [startupRef] }, { model: User, as: 'submittedBy', attributes: ['id', 'name'] }],
      order: [['createdAt', 'ASC']],
    }),
    MeetingRequest.findAll({ where: { mentorId: mentor.id, status: 'pending' }, include: [startupRef], order: [['requestedDate', 'ASC']] }),
    Meeting.findAll({ where: { mentorId: mentor.id, status: 'scheduled', date: { [Op.gte]: today() } }, include: [startupRef], order: [['date', 'ASC'], ['time', 'ASC']] }),
    Milestone.count({ where: { startupId: ids, status: 'completed' } }),
  ]);
  return { mentor, assignments, pendingReviews, meetingRequests, upcomingMeetings, completedMilestones };
}

async function investorDashboard(req) {
  const investor = await investorFor(req);
  const focus = String(investor?.focusIndustries || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const [startups, offers, meetings] = await Promise.all([
    Startup.findAll({ where: { status: INVESTABLE }, order: [['progress', 'DESC'], ['rating', 'DESC']] }),
    InvestmentInterest.findAll({ where: { investorId: investor.id }, include: [{ model: Startup, as: 'startup', attributes: ['id', 'startupName', 'industry', 'status'] }], order: [['createdAt', 'DESC']] }),
    InvestorMeeting.findAll({ where: { investorId: investor.id, status: ['pending', 'accepted'], date: { [Op.gte]: today() } }, include: [startupRef], order: [['date', 'ASC'], ['time', 'ASC']] }),
  ]);
  const finance = await financeSummary(startups.map((s) => s.id));
  const offered = new Set(offers.filter((o) => ['pending', 'accepted'].includes(o.status)).map((o) => o.startupId));
  const enrich = (s) => ({ ...s.toJSON(), adminRemarks: undefined, finance: finance[s.id] });
  const recommended = startups
    .filter((s) => !offered.has(s.id))
    .sort((a, b) => Number(focus.includes(b.industry.toLowerCase())) - Number(focus.includes(a.industry.toLowerCase())))
    .slice(0, 6)
    .map((s) => ({ ...enrich(s), matchesFocus: focus.includes(s.industry.toLowerCase()) }));
  const accepted = offers.filter((o) => o.status === 'accepted' && o.clearance === 'cleared');
  return {
    investor,
    availableStartups: startups.length,
    recommended,
    offers: offers.slice(0, 8),
    stats: {
      offers: offers.length,
      pending: offers.filter((o) => o.status === 'pending').length,
      deals: accepted.length,
      committed: accepted.reduce((t, o) => t + Number(o.amount), 0),
      awaitingClearance: offers.filter((o) => o.status === 'accepted' && ['under_review', 'on_hold'].includes(o.clearance)).length,
    },
    meetings,
  };
}

async function adminDashboard() {
  const [stats, pendingStartups, transactionsToReview, recentActivity, awaitingFinance] = await Promise.all([
    summary(),
    Startup.findAll({ where: { status: 'pending' }, include: [{ model: User, as: 'founder', attributes: ['id', 'name'] }], order: [['submittedAt', 'ASC']], limit: 6 }),
    InvestmentInterest.findAll({ where: { status: 'accepted', clearance: ['under_review', 'on_hold'] }, include: [startupRef, investorUser], order: [['respondedAt', 'ASC']], limit: 6 }),
    AuditLog.findAll({ include: [{ model: User, as: 'user', attributes: ['id', 'name'] }], order: [['createdAt', 'DESC']], limit: 8 }),
    Startup.findAll({ where: { status: 'approved' }, attributes: ['id', 'startupName', 'industry'], order: [['updatedAt', 'ASC']] }),
  ]);
  return { stats, pendingStartups, transactionsToReview, recentActivity, awaitingFinance };
}

router.get('/', async (req, res) => {
  const build = { student: studentDashboard, mentor: mentorDashboard, admin: adminDashboard, investor: investorDashboard }[req.role];
  const [data, notifications] = await Promise.all([build(req), notificationsFor(req.user.id)]);
  res.json({ role: req.role, ...data, notifications });
});

export default router;
