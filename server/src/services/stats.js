/** Aggregations for Module 10 (Reports) and the admin dashboard. Computed in JS so they work on SQLite and PostgreSQL alike. */
import { Startup, User, Role, Mentor, MentorAssignment, Workshop, WorkshopRegistration, Feedback, Investor, InvestmentInterest } from '../models/index.js';
import { ACTIVE_ASSIGNMENT } from './access.js';
import { today } from '../utils/http.js';

const countBy = (rows, key) => rows.reduce((acc, r) => ((acc[r[key]] = (acc[r[key]] || 0) + 1), acc), {});
const sum = (rows, key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);
const monthKey = (d) => new Date(d).toISOString().slice(0, 7);

function lastMonths(n) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export async function summary() {
  const [startups, users, workshops, registrations, assignments, interests] = await Promise.all([
    Startup.findAll({ attributes: ['id', 'status', 'industry', 'createdAt', 'progress'] }),
    User.findAll({ attributes: ['id', 'createdAt', 'status'], include: [{ model: Role, as: 'role', attributes: ['roleName'] }] }),
    Workshop.findAll({ attributes: ['id', 'status', 'date', 'type'] }),
    WorkshopRegistration.findAll({ attributes: ['attendanceStatus'] }),
    MentorAssignment.findAll({ where: { status: ACTIVE_ASSIGNMENT }, attributes: ['mentorId'] }),
    InvestmentInterest.findAll({ attributes: ['amount', 'status', 'startupId', 'clearance', 'respondedAt', 'reviewedAt'] }),
  ]);
  const submitted = startups.filter((s) => s.status !== 'draft');
  const months = lastMonths(6);
  // Transactions = offers the founder accepted; the Incubation Cell clears, holds or cancels each one.
  const transactions = interests.filter((i) => i.status === 'accepted');
  const cleared = transactions.filter((t) => t.clearance === 'cleared');
  const awaiting = transactions.filter((t) => ['under_review', 'on_hold'].includes(t.clearance));
  const roleCounts = countBy(users.map((u) => ({ role: u.role.roleName })), 'role');

  return {
    totals: {
      startups: submitted.length,
      drafts: startups.length - submitted.length,
      activeIncubations: startups.filter((s) => s.status === 'incubated').length,
      students: roleCounts.student || 0,
      investors: roleCounts.investor || 0,
      mentors: roleCounts.mentor || 0,
      activeMentors: new Set(assignments.map((a) => a.mentorId)).size,
      users: users.length,
      averageProgress: submitted.length ? Math.round(sum(submitted, 'progress') / submitted.length) : 0,
    },
    startupsByStatus: countBy(startups, 'status'),
    industry: countBy(submitted, 'industry'),
    transactions: {
      total: transactions.length,
      cleared: cleared.length,
      clearedAmount: sum(cleared, 'amount'),
      awaiting: awaiting.length,
      awaitingAmount: sum(awaiting, 'amount'),
      byClearance: countBy(transactions, 'clearance'),
    },
    investments: {
      offers: interests.length,
      pending: interests.filter((i) => i.status === 'pending').length,
      deals: cleared.length,
      committed: sum(cleared, 'amount'),
      byStatus: countBy(interests, 'status'),
    },
    pendingApprovals: {
      startups: startups.filter((s) => s.status === 'pending').length,
      transactions: awaiting.length,
    },
    monthly: months.map((m) => ({
      month: m,
      registrations: users.filter((u) => monthKey(u.createdAt) === m).length,
      startups: startups.filter((s) => monthKey(s.createdAt) === m).length,
      financeCleared: sum(cleared.filter((t) => t.reviewedAt && monthKey(t.reviewedAt) === m), 'amount'),
    })),
    workshops: {
      total: workshops.length,
      upcoming: workshops.filter((w) => w.status === 'upcoming' && w.date >= today()).length,
      byType: countBy(workshops, 'type'),
      registrations: registrations.length,
      attended: registrations.filter((r) => r.attendanceStatus === 'present').length,
    },
  };
}

/** Tabular data for a generated report. Returns { columns, rows }. */
export async function reportRows(type) {
  if (type === 'startups') {
    const rows = await Startup.findAll({ include: [{ model: User, as: 'founder', attributes: ['name', 'email'] }], order: [['createdAt', 'DESC']] });
    return {
      columns: ['Startup', 'Industry', 'Status', 'Founder', 'Founder Email', 'Progress %', 'Rating', 'Created'],
      rows: rows.map((s) => [s.startupName, s.industry, s.status, s.founder?.name, s.founder?.email, s.progress, s.rating, s.createdAt.toISOString().slice(0, 10)]),
    };
  }
  if (type === 'funding') {
    const rows = await InvestmentInterest.findAll({
      where: { status: 'accepted' },
      include: [
        { model: Startup, as: 'startup', attributes: ['startupName'] },
        { model: Investor, as: 'investor', attributes: ['firmName'], include: [{ model: User, as: 'user', attributes: ['name'] }] },
      ],
      order: [['respondedAt', 'DESC']],
    });
    const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
    return {
      columns: ['Startup', 'Investor', 'Amount (INR)', 'Instrument', 'Accepted On', 'Clearance', 'Reviewed On', 'Remarks'],
      rows: rows.map((t) => [t.startup?.startupName, t.investor?.firmName ? `${t.investor.user?.name} (${t.investor.firmName})` : t.investor?.user?.name,
        Number(t.amount), t.instrument, day(t.respondedAt), (t.clearance || '').replace('_', ' '), day(t.reviewedAt), t.clearanceNote || '']),
    };
  }
  if (type === 'mentors') {
    const mentors = await Mentor.findAll({
      include: [
        { model: User, as: 'user', attributes: ['name', 'email'] },
        { model: MentorAssignment, as: 'assignments', required: false, where: { status: ACTIVE_ASSIGNMENT }, attributes: ['id'] },
        { model: Feedback, as: 'feedback', attributes: ['id'] },
      ],
    });
    return {
      columns: ['Mentor', 'Email', 'Expertise', 'Active Startups', 'Feedback Given', 'Avg Rating Given'],
      rows: mentors.map((m) => [m.user?.name, m.user?.email, m.expertise || '', m.assignments.length, m.feedback.length, m.rating]),
    };
  }
  if (type === 'industry') {
    const s = await summary();
    const all = await Startup.findAll({ attributes: ['industry', 'status'] });
    return {
      columns: ['Industry', 'Submitted Startups', 'Approved', 'Incubated'],
      rows: Object.entries(s.industry).map(([ind, n]) => [ind, n,
        all.filter((x) => x.industry === ind && x.status === 'approved').length,
        all.filter((x) => x.industry === ind && x.status === 'incubated').length]),
    };
  }
  if (type === 'registrations') {
    const s = await summary();
    return { columns: ['Month', 'New Users', 'New Startups', 'Finance Cleared (INR)'], rows: s.monthly.map((m) => [m.month, m.registrations, m.startups, m.financeCleared]) };
  }
  if (type === 'investments') {
    const rows = await InvestmentInterest.findAll({
      include: [
        { model: Startup, as: 'startup', attributes: ['startupName', 'status'] },
        { model: Investor, as: 'investor', attributes: ['firmName'], include: [{ model: User, as: 'user', attributes: ['name'] }] },
      ],
      order: [['createdAt', 'DESC']],
    });
    return {
      columns: ['Startup', 'Startup Status', 'Investor', 'Firm', 'Amount (INR)', 'Equity %', 'Instrument', 'Offer Status', 'Clearance', 'Offered On'],
      rows: rows.map((i) => [i.startup?.startupName, i.startup?.status, i.investor?.user?.name, i.investor?.firmName || '', Number(i.amount), i.equity ?? '', i.instrument, i.status, (i.clearance || '').replace('_', ' '), i.createdAt.toISOString().slice(0, 10)]),
    };
  }
  if (type === 'workshops') {
    const rows = await Workshop.findAll({ include: [{ model: WorkshopRegistration, as: 'registrations', attributes: ['attendanceStatus'] }], order: [['date', 'DESC']] });
    return {
      columns: ['Title', 'Type', 'Date', 'Venue', 'Status', 'Registered', 'Attended'],
      rows: rows.map((w) => [w.title, w.type, w.date, w.venue || '', w.status, w.registrations.length, w.registrations.filter((r) => r.attendanceStatus === 'present').length]),
    };
  }
  return null;
}

export const REPORT_TYPES = {
  startups: 'Startup Register',
  funding: 'Funding Transactions',
  mentors: 'Mentor Activity',
  industry: 'Industry-wise Startups',
  registrations: 'Monthly Registrations',
  workshops: 'Workshop Statistics',
  investments: 'Investor Offers & Deals',
};
