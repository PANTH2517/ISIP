/** Module 3 — Mentor Management: mentor directory and mentor assignments. */
import { Router } from 'express';
import { Mentor, MentorAssignment, User, Startup, Feedback, MeetingRequest, Meeting } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { loadStartup, mentorFor, ACTIVE_ASSIGNMENT } from '../services/access.js';
import { notify, adminIds } from '../services/notify.js';
import { HttpError, requireFields } from '../utils/http.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'student'), async (req, res) => {
  const mentors = await Mentor.findAll({
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'status'], where: { status: 'active' } },
      { model: MentorAssignment, as: 'assignments', required: false, where: { status: ACTIVE_ASSIGNMENT }, attributes: ['id', 'startupId', 'status'] },
    ],
    order: [[{ model: User, as: 'user' }, 'name', 'ASC']],
  });
  res.json(mentors.map((m) => ({ ...m.toJSON(), activeAssignments: m.assignments.length })));
});

router.get('/me', authorize('mentor'), async (req, res) => {
  const mentor = await mentorFor(req);
  const assignments = await MentorAssignment.findAll({
    where: { mentorId: mentor.id, status: ACTIVE_ASSIGNMENT },
    include: [{ model: Startup, as: 'startup', include: [{ model: User, as: 'founder', attributes: ['id', 'name', 'email'] }] }],
    order: [['assignedDate', 'DESC']],
  });
  const feedbackCount = await Feedback.count({ where: { mentorId: mentor.id } });
  res.json({ mentor, assignments, feedbackCount });
});

router.get('/assignments', async (req, res) => {
  if (!req.query.startupId) throw new HttpError(400, 'startupId is required');
  await loadStartup(req, req.query.startupId);
  const rows = await MentorAssignment.findAll({
    where: { startupId: req.query.startupId },
    include: [{ model: Mentor, as: 'mentor', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] }],
    order: [['assignedDate', 'DESC']],
  });
  res.json(rows);
});

router.post('/assignments', authorize('admin'), async (req, res) => {
  requireFields(req.body, ['startupId', 'mentorId']);
  const startup = await loadStartup(req, req.body.startupId);
  if (!['approved', 'incubated'].includes(startup.status)) throw new HttpError(400, 'Mentors can only be assigned to approved or incubated startups');
  const mentor = await Mentor.findByPk(req.body.mentorId, { include: [{ model: User, as: 'user' }] });
  if (!mentor) throw new HttpError(404, 'Mentor not found');
  const existing = await MentorAssignment.findOne({ where: { startupId: startup.id, mentorId: mentor.id, status: ACTIVE_ASSIGNMENT } });
  if (existing) throw new HttpError(409, `${mentor.user.name} is already assigned to this startup`);
  const assignment = await MentorAssignment.create({ startupId: startup.id, mentorId: mentor.id });
  await notify(mentor.userId, { message: `You have been assigned to mentor "${startup.startupName}". Please accept the assignment.`, type: 'mentor', link: '/mentor/startups' });
  await notify(startup.createdById, { message: `${mentor.user.name} has been assigned as mentor for ${startup.startupName}.`, type: 'mentor', link: `/startups/${startup.id}` });
  res.status(201).json(assignment);
});

router.patch('/assignments/:id/accept', authorize('mentor'), async (req, res) => {
  const mentor = await mentorFor(req);
  const assignment = await MentorAssignment.findOne({ where: { id: req.params.id, mentorId: mentor.id }, include: [{ model: Startup, as: 'startup' }] });
  if (!assignment) throw new HttpError(404, 'Assignment not found');
  if (assignment.status !== 'assigned') throw new HttpError(400, `Assignment is already ${assignment.status}`);
  await assignment.update({ status: 'accepted' });
  await notify([assignment.startup.createdById, ...(await adminIds())], {
    message: `${req.user.name} accepted the mentorship of ${assignment.startup.startupName}.`, type: 'mentor', link: `/startups/${assignment.startupId}`,
  }, { email: false });
  res.json(assignment);
});

router.delete('/assignments/:id', authorize('admin'), async (req, res) => {
  const assignment = await MentorAssignment.findByPk(req.params.id, { include: [{ model: Startup, as: 'startup' }, { model: Mentor, as: 'mentor' }] });
  if (!assignment) throw new HttpError(404, 'Assignment not found');
  await assignment.update({ status: 'removed' });
  // Their open requests and upcoming meetings with this startup can no longer go ahead.
  const scope = { startupId: assignment.startupId, mentorId: assignment.mentorId };
  const [closedRequests] = await MeetingRequest.update(
    { status: 'rejected', mentorNote: 'Closed automatically: the mentor was reassigned.' },
    { where: { ...scope, status: 'pending' } },
  );
  const [cancelledMeetings] = await Meeting.update(
    { status: 'cancelled', notes: 'Cancelled automatically: the mentor was reassigned.' },
    { where: { ...scope, status: 'scheduled' } },
  );
  await notify(assignment.mentor.userId, { message: `You have been unassigned from ${assignment.startup.startupName}.`, type: 'mentor' }, { email: false });
  if (closedRequests || cancelledMeetings) {
    await notify(assignment.startup.createdById, {
      message: `${closedRequests + cancelledMeetings} meeting(s) with your previous mentor for ${assignment.startup.startupName} were cancelled because the mentor was reassigned.`,
      type: 'meeting', link: '/meetings',
    }, { email: false });
  }
  res.json({ message: 'Mentor removed from startup' });
});

export default router;
