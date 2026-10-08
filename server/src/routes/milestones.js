/** Module 4 — Milestone Tracking: students submit updates, mentors approve, progress bar recalculates. */
import { Router } from 'express';
import { Milestone, MilestoneUpdate, User, Startup } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { loadStartup, recalcProgress } from '../services/access.js';
import { notify, adminIds, mentorUserIdsForStartup } from '../services/notify.js';
import { HttpError, requireFields, pick } from '../utils/http.js';

const router = Router();
router.use(authenticate);

async function loadMilestone(req, id, opts) {
  const milestone = await Milestone.findByPk(id);
  if (!milestone) throw new HttpError(404, 'Milestone not found');
  const startup = await loadStartup(req, milestone.startupId, opts);
  return { milestone, startup };
}

router.get('/', async (req, res) => {
  if (!req.query.startupId) throw new HttpError(400, 'startupId is required');
  const startup = await loadStartup(req, req.query.startupId, { investorView: true });
  const milestones = await Milestone.findAll({
    where: { startupId: startup.id },
    include: [{ model: MilestoneUpdate, as: 'updates', include: [{ model: User, as: 'submittedBy', attributes: ['id', 'name'] }] }],
    order: [['order', 'ASC'], [{ model: MilestoneUpdate, as: 'updates' }, 'createdAt', 'DESC']],
  });
  res.json({ progress: startup.progress, milestones });
});

router.post('/', authorize('mentor', 'admin'), async (req, res) => {
  requireFields(req.body, ['startupId', 'name']);
  const startup = await loadStartup(req, req.body.startupId);
  const order = ((await Milestone.max('order', { where: { startupId: startup.id } })) || 0) + 1;
  const milestone = await Milestone.create({ ...pick(req.body, ['name', 'description', 'dueDate']), startupId: startup.id, order });
  await recalcProgress(startup.id);
  await notify(startup.createdById, { message: `New milestone added to ${startup.startupName}: ${milestone.name}`, type: 'milestone', link: `/startups/${startup.id}?tab=milestones` }, { email: false });
  res.status(201).json(milestone);
});

router.put('/:id', authorize('mentor', 'admin'), async (req, res) => {
  const { milestone } = await loadMilestone(req, req.params.id);
  const changes = pick(req.body, ['name', 'description', 'dueDate']);
  if (req.body.status && ['pending', 'in_progress'].includes(req.body.status)) changes.status = req.body.status;
  await milestone.update(changes);
  await recalcProgress(milestone.startupId);
  res.json(milestone);
});

router.delete('/:id', authorize('mentor', 'admin'), async (req, res) => {
  const { milestone } = await loadMilestone(req, req.params.id);
  await milestone.destroy();
  await recalcProgress(milestone.startupId);
  res.json({ message: 'Milestone deleted' });
});

// Student submits a progress update for a milestone.
router.post('/:id/updates', authorize('student'), async (req, res) => {
  requireFields(req.body, ['comments']);
  const { milestone, startup } = await loadMilestone(req, req.params.id, { ownerOnly: true });
  if (!['approved', 'incubated'].includes(startup.status)) throw new HttpError(400, 'Milestones can be updated once the startup is approved');
  if (milestone.status === 'completed') throw new HttpError(400, 'This milestone is already completed');
  if (milestone.status === 'submitted') throw new HttpError(400, 'An update is already awaiting mentor review');
  const update = await MilestoneUpdate.create({ milestoneId: milestone.id, submittedById: req.user.id, comments: req.body.comments });
  await milestone.update({ status: 'submitted' });
  let reviewers = await mentorUserIdsForStartup(startup.id);
  if (!reviewers.length) reviewers = await adminIds();
  await notify(reviewers, { message: `${startup.startupName} submitted "${milestone.name}" for review`, type: 'milestone', link: `/startups/${startup.id}?tab=milestones` });
  res.status(201).json(update);
});

async function completeMilestone(milestone, startup, note) {
  await milestone.update({ status: 'completed', completedAt: new Date() });
  const progress = await recalcProgress(startup.id);
  await notify(startup.createdById, {
    message: `Milestone "${milestone.name}" approved for ${startup.startupName}. Progress is now ${progress}%.${note ? ` Mentor note: ${note}` : ''}`,
    type: 'milestone', link: `/startups/${startup.id}?tab=milestones`,
  });
  return progress;
}

// Mentor reviews a submitted update.
router.post('/updates/:updateId/review', authorize('mentor', 'admin'), async (req, res) => {
  const { decision, mentorComments } = req.body;
  if (!['approved', 'rejected'].includes(decision)) throw new HttpError(400, 'Decision must be approved or rejected');
  const update = await MilestoneUpdate.findByPk(req.params.updateId);
  if (!update) throw new HttpError(404, 'Update not found');
  if (update.status !== 'submitted') throw new HttpError(400, 'This update has already been reviewed');
  const { milestone, startup } = await loadMilestone(req, update.milestoneId);
  await update.update({ status: decision, mentorComments, reviewedAt: new Date() });
  if (decision === 'approved') {
    await completeMilestone(milestone, startup, mentorComments);
  } else {
    await milestone.update({ status: 'in_progress' });
    await notify(startup.createdById, {
      message: `Update for "${milestone.name}" needs more work.${mentorComments ? ` Mentor note: ${mentorComments}` : ''}`,
      type: 'milestone', link: `/startups/${startup.id}?tab=milestones`,
    });
  }
  res.json({ update, progress: (await Startup.findByPk(startup.id)).progress });
});

// Mentor marks a milestone complete directly.
router.post('/:id/complete', authorize('mentor', 'admin'), async (req, res) => {
  const { milestone, startup } = await loadMilestone(req, req.params.id);
  if (milestone.status === 'completed') throw new HttpError(400, 'Milestone is already completed');
  await MilestoneUpdate.update({ status: 'approved', reviewedAt: new Date() }, { where: { milestoneId: milestone.id, status: 'submitted' } });
  const progress = await completeMilestone(milestone, startup, req.body?.note);
  res.json({ milestone, progress });
});

export default router;
