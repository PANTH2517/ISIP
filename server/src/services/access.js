import { Op } from 'sequelize';
import { Startup, Mentor, MentorAssignment, Milestone, Investor, FundingRequest, InvestmentInterest } from '../models/index.js';
import { HttpError } from '../utils/http.js';
import { notify, adminIds, mentorUserIdsForStartup } from './notify.js';

export const ACTIVE_ASSIGNMENT = { [Op.in]: ['assigned', 'accepted'] };
/** Statuses an investor may browse ("approved startups"). */
export const INVESTABLE = ['approved', 'incubated'];

export async function mentorFor(req) {
  if (req.role !== 'mentor') return null;
  return req.user.mentorProfile || Mentor.findOne({ where: { userId: req.user.id } });
}

export async function investorFor(req) {
  if (req.role !== 'investor') return null;
  return req.user.investorProfile || Investor.findOne({ where: { userId: req.user.id } });
}

/** IDs of the startups the current user may see (null = all, for admins). */
export async function visibleStartupIds(req) {
  if (req.role === 'admin') return null;
  if (req.role === 'student') {
    return (await Startup.findAll({ where: { createdById: req.user.id }, attributes: ['id'] })).map((s) => s.id);
  }
  if (req.role === 'investor') {
    return (await Startup.findAll({ where: { status: INVESTABLE }, attributes: ['id'] })).map((s) => s.id);
  }
  const mentor = await mentorFor(req);
  if (!mentor) return [];
  const rows = await MentorAssignment.findAll({ where: { mentorId: mentor.id, status: ACTIVE_ASSIGNMENT }, attributes: ['startupId'] });
  return rows.map((r) => r.startupId);
}

/**
 * Loads a startup and enforces role-based access:
 * admin → any; student → own startups; mentor → actively assigned startups;
 * investor → approved/incubated startups, and only where the route opts in with { investorView: true } (read-only views).
 * Pass { ownerOnly: true } for actions only the founder (or an admin) may perform.
 */
export async function loadStartup(req, id, { ownerOnly = false, allowAdmin = true, investorView = false } = {}) {
  const startup = await Startup.findByPk(id);
  if (!startup) throw new HttpError(404, 'Startup not found');
  if (req.role === 'admin' && allowAdmin) return startup;
  if (req.role === 'student' && startup.createdById === req.user.id) return startup;
  if (!ownerOnly && req.role === 'mentor') {
    const mentor = await mentorFor(req);
    if (mentor && (await MentorAssignment.count({ where: { startupId: startup.id, mentorId: mentor.id, status: ACTIVE_ASSIGNMENT } }))) {
      return startup;
    }
  }
  if (!ownerOnly && investorView && req.role === 'investor' && INVESTABLE.includes(startup.status)) return startup;
  throw new HttpError(403, 'You do not have access to this startup');
}

/** Milestone Tracking — progress bar = completed milestones / total milestones. */
export async function recalcProgress(startupId) {
  const milestones = await Milestone.findAll({ where: { startupId }, attributes: ['status'] });
  const done = milestones.filter((m) => m.status === 'completed').length;
  const progress = milestones.length ? Math.round((done * 100) / milestones.length) : 0;
  await Startup.update({ progress }, { where: { id: startupId } });
  return progress;
}

/** Finance secured by a startup: approved incubation funding + accepted investor offers. */
export async function financeSummary(startupIds) {
  const ids = [].concat(startupIds);
  const [funding, investments] = await Promise.all([
    FundingRequest.findAll({ where: { startupId: ids, status: 'approved' }, attributes: ['startupId', 'approvedAmount'] }),
    InvestmentInterest.findAll({ where: { startupId: ids, status: 'accepted' }, attributes: ['startupId', 'amount'] }),
  ]);
  const out = {};
  for (const id of ids) {
    const fundingApproved = funding.filter((f) => f.startupId === id).reduce((s, f) => s + Number(f.approvedAmount || 0), 0);
    const f = investments.filter((i) => i.startupId === id);
    const investmentCommitted = f.reduce((s, i) => s + Number(i.amount), 0);
    out[id] = { fundingApproved, investmentCommitted, investors: f.length, total: fundingApproved + investmentCommitted, financed: fundingApproved + investmentCommitted > 0 };
  }
  return Array.isArray(startupIds) ? out : out[startupIds];
}

/**
 * Business rule: a startup is incubated only once it secures finance.
 * Called after a funding approval or an accepted investor offer; promotes approved → incubated.
 * Returns true when the startup was incubated by this call.
 */
export async function incubateIfFinanced(startupId, reason) {
  const startup = await Startup.findByPk(startupId);
  if (!startup || startup.status !== 'approved') return false;
  if (!(await financeSummary(startupId)).financed) return false;
  await startup.update({ status: 'incubated' });
  await notify([startup.createdById, ...(await mentorUserIdsForStartup(startup.id)), ...(await adminIds())], {
    message: `🚀 ${startup.startupName} has secured finance (${reason}) and is now officially incubated!`,
    type: 'startup', link: `/startups/${startup.id}`,
  });
  return true;
}
