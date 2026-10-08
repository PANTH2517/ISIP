/** Module 6 — Meeting Scheduler: students request, mentors accept / reject / reschedule or schedule directly, history kept. */
import { Router } from 'express';
import { Op } from 'sequelize';
import { MeetingRequest, Meeting, Startup, Mentor, MentorAssignment, User } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { loadStartup, mentorFor, ACTIVE_ASSIGNMENT } from '../services/access.js';
import { notify } from '../services/notify.js';
import { HttpError, requireFields, today, validateSlot, humanSlot } from '../utils/http.js';
import { sweepFirst, checkInWindowError, slotStart, findClash } from '../services/meetingLifecycle.js';

const router = Router();
router.use(authenticate, authorize('student', 'mentor', 'admin'), sweepFirst);

const people = [
  { model: Startup, as: 'startup', attributes: ['id', 'startupName', 'createdById'] },
  { model: Mentor, as: 'mentor', attributes: ['id', 'userId'], include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] },
];

/** 409 if the mentor or the startup already has a confirmed meeting overlapping this slot. */
async function assertFree({ mentorId, startupId, date, time, excludeId }) {
  const sameDay = await Meeting.findAll({ where: { date, status: 'scheduled', [Op.or]: [{ mentorId }, { startupId }] }, include: people });
  const clash = findClash(sameDay, time, excludeId);
  if (clash) {
    const who = clash.mentorId === mentorId ? clash.mentor.user.name : clash.startup.startupName;
    throw new HttpError(409, `${who} already has a meeting at ${humanSlot(clash.date, clash.time)}. Please pick another time.`);
  }
}

/** Mentors may only act on startups they are still assigned to. */
async function assertAssigned(req, startupId) {
  if (req.role !== 'mentor') return;
  const mentor = await mentorFor(req);
  if (!(await MentorAssignment.count({ where: { startupId, mentorId: mentor.id, status: ACTIVE_ASSIGNMENT } }))) {
    throw new HttpError(403, 'You are no longer the mentor for this startup');
  }
}

/** Where-clause limiting rows to the current user's startups (student) or mentorships (mentor). */
async function scope(req) {
  if (req.role === 'admin') return {};
  if (req.role === 'mentor') return { mentorId: (await mentorFor(req))?.id ?? -1 };
  const ids = (await Startup.findAll({ where: { createdById: req.user.id }, attributes: ['id'] })).map((s) => s.id);
  return { startupId: ids };
}

router.get('/requests', async (req, res) => {
  const where = await scope(req);
  if (req.query.status) where.status = req.query.status;
  if (req.query.startupId) where.startupId = req.query.startupId;
  res.json(await MeetingRequest.findAll({
    where,
    include: [...people, { model: User, as: 'requestedBy', attributes: ['id', 'name'] }, { model: Meeting, as: 'meeting' }],
    order: [['createdAt', 'DESC']],
  }));
});

router.post('/requests', authorize('student'), async (req, res) => {
  requireFields(req.body, ['startupId', 'mentorId', 'requestedDate', 'requestedTime']);
  const startup = await loadStartup(req, req.body.startupId, { ownerOnly: true });
  validateSlot(req.body.requestedDate, req.body.requestedTime);
  const assignment = await MentorAssignment.findOne({
    where: { startupId: startup.id, mentorId: req.body.mentorId, status: ACTIVE_ASSIGNMENT },
    include: [{ model: Mentor, as: 'mentor' }],
  });
  if (!assignment) throw new HttpError(400, 'You can only request meetings with a mentor assigned to your startup');
  const request = await MeetingRequest.create({
    startupId: startup.id, mentorId: assignment.mentorId, requestedById: req.user.id,
    requestedDate: req.body.requestedDate, requestedTime: req.body.requestedTime, agenda: req.body.agenda,
    location: String(req.body.location || '').trim() || null,
  });
  await notify(assignment.mentor.userId, {
    message: `${startup.startupName} requested a meeting on ${humanSlot(request.requestedDate, request.requestedTime)}`, type: 'meeting', link: '/meetings',
  });
  res.status(201).json(request);
});

router.patch('/requests/:id', authorize('mentor', 'admin'), async (req, res) => {
  const { action, date, time, note } = req.body;
  if (!['accept', 'reject', 'reschedule'].includes(action)) throw new HttpError(400, 'Action must be accept, reject or reschedule');
  const request = await MeetingRequest.findByPk(req.params.id, { include: people });
  if (!request) throw new HttpError(404, 'Meeting request not found');
  if (req.role === 'mentor' && request.mentorId !== (await mentorFor(req))?.id) throw new HttpError(403, 'This request is not addressed to you');
  if (request.status !== 'pending') throw new HttpError(400, `This request is already ${request.status}`);
  await assertAssigned(req, request.startupId);

  let meeting = null;
  if (action === 'reject') {
    await request.update({ status: 'rejected', mentorNote: note });
  } else {
    const slot = action === 'reschedule' ? { date, time } : { date: request.requestedDate, time: request.requestedTime };
    if (action === 'reschedule') validateSlot(date, time);
    await assertFree({ mentorId: request.mentorId, startupId: request.startupId, ...slot });
    await request.update({ status: action === 'accept' ? 'accepted' : 'rescheduled', mentorNote: note });
    meeting = await Meeting.create({
      ...slot, meetingRequestId: request.id, startupId: request.startupId, mentorId: request.mentorId, agenda: request.agenda,
      location: String(req.body.location || '').trim() || request.location,
    });
  }
  const msg = {
    accept: `Meeting confirmed with ${request.mentor.user.name} on ${humanSlot(meeting?.date, meeting?.time)}`,
    reschedule: `${request.mentor.user.name} rescheduled your meeting to ${humanSlot(meeting?.date, meeting?.time)}`,
    reject: `${request.mentor.user.name} declined your meeting request for ${humanSlot(request.requestedDate, request.requestedTime)}`,
  }[action];
  await notify(request.startup.createdById, { message: `${msg}${note ? `. Note: ${note}` : ''}`, type: 'meeting', link: '/meetings' });
  res.json({ request, meeting });
});

// Mentor schedules a meeting with one of their startups directly (confirmed straight away).
router.post('/', authorize('mentor'), async (req, res) => {
  requireFields(req.body, ['startupId', 'date', 'time']);
  const mentor = await mentorFor(req);
  const startup = await loadStartup(req, req.body.startupId);
  validateSlot(req.body.date, req.body.time);
  await assertFree({ mentorId: mentor.id, startupId: startup.id, date: req.body.date, time: req.body.time });
  const meeting = await Meeting.create({
    startupId: startup.id, mentorId: mentor.id, date: req.body.date, time: req.body.time, agenda: req.body.agenda,
    location: String(req.body.location || '').trim() || null, scheduledBy: 'mentor',
  });
  await notify(startup.createdById, {
    message: `${req.user.name} scheduled a mentoring meeting for ${startup.startupName} on ${humanSlot(meeting.date, meeting.time)}${meeting.agenda ? `: ${meeting.agenda}` : ''}`,
    type: 'meeting', link: '/meetings',
  });
  res.status(201).json(meeting);
});

router.get('/', async (req, res) => {
  const where = await scope(req);
  if (req.query.upcoming === 'true') {
    where.date = { [Op.gte]: today() };
    where.status = 'scheduled';
  }
  if (req.query.startupId) where.startupId = req.query.startupId;
  res.json(await Meeting.findAll({ where, include: people, order: [['date', 'ASC'], ['time', 'ASC']] }));
});

router.patch('/:id', async (req, res) => {
  const { action, date, time, notes } = req.body;
  const meeting = await Meeting.findByPk(req.params.id, { include: people });
  if (!meeting) throw new HttpError(404, 'Meeting not found');
  const isMentor = req.role === 'mentor' && meeting.mentorId === (await mentorFor(req))?.id;
  const isFounder = req.role === 'student' && meeting.startup.createdById === req.user.id;
  if (!isMentor && !isFounder && req.role !== 'admin') throw new HttpError(403, 'You are not part of this meeting');
  if (meeting.status !== 'scheduled') throw new HttpError(400, `This meeting is already ${meeting.status}`);

  const started = Date.now() >= slotStart(meeting.date, meeting.time).getTime();
  if (action === 'checkin') {
    const err = checkInWindowError(meeting.date, meeting.time);
    if (err) throw new HttpError(400, err);
    if (!meeting.checkedInAt) await meeting.update({ checkedInAt: new Date() });
  } else if (action === 'cancel') {
    await meeting.update({ status: 'cancelled', notes: notes ?? meeting.notes });
  } else if (action === 'complete' && !isFounder) {
    if (!started) throw new HttpError(400, "A meeting can't be completed before it starts");
    await meeting.update({ status: 'completed', notes: notes ?? meeting.notes });
  } else if (action === 'reschedule' && !isFounder) {
    if (meeting.checkedInAt) throw new HttpError(400, 'This meeting is already in progress');
    validateSlot(date, time);
    await assertFree({ mentorId: meeting.mentorId, startupId: meeting.startupId, date, time, excludeId: meeting.id });
    await meeting.update({ date, time, notes: notes ?? meeting.notes });
  } else {
    throw new HttpError(400, 'Invalid action');
  }
  const other = isFounder ? meeting.mentor.userId : meeting.startup.createdById;
  const text = { checkin: 'checked in to', cancel: 'cancelled', complete: 'marked as completed', reschedule: `rescheduled to ${humanSlot(date, time)}` }[action];
  const message = action === 'checkin'
    ? `${req.user.name} checked in to the meeting for ${meeting.startup.startupName}. Join now.`
    : `Meeting for ${meeting.startup.startupName} was ${text} by ${req.user.name}`;
  await notify(other, { message, type: 'meeting', link: '/meetings' }, { email: action !== 'checkin' });
  res.json(meeting);
});

export default router;
