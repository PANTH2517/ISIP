/**
 * Meeting lifecycle automation (mentor meetings and investor meetings):
 *  - a request nobody confirmed before its start time  → "expired"
 *  - a confirmed meeting nobody checked in to within GRACE_MINUTES of the start → "missed" (auto-cancelled)
 *  - a checked-in meeting not closed AUTO_COMPLETE_MINUTES after the start → "completed"
 * Both participants are notified of every automatic change.
 */
import { Op } from 'sequelize';
import { Meeting, MeetingRequest, InvestorMeeting, Startup, Mentor, Investor } from '../models/index.js';
import { notify } from './notify.js';
import { humanSlot } from '../utils/http.js';

export const GRACE_MINUTES = 10;
export const CHECKIN_OPENS_MINUTES = 15;
export const AUTO_COMPLETE_MINUTES = 60;

const pad = (n) => String(n).padStart(2, '0');
const localSlot = (d) => ({ date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` });

/** Start of a meeting slot as a Date in server-local time. */
export const slotStart = (date, time) => new Date(`${date}T${time}:00`);

/** Where-clause: the slot stored in (dateCol, timeCol) starts at or before `moment`. */
function startedBy(moment, dateCol = 'date', timeCol = 'time') {
  const { date, time } = localSlot(moment);
  return { [Op.or]: [{ [dateCol]: { [Op.lt]: date } }, { [dateCol]: date, [timeCol]: { [Op.lte]: time } }] };
}

/** Meetings are treated as 30-minute slots for clash detection. */
export const SLOT_MINUTES = 30;
const minutes = (time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };

/**
 * Returns the first meeting in `rows` (same date) that overlaps `time`, ignoring `excludeId`.
 * Used to stop a mentor, investor or founder being double-booked.
 */
export function findClash(rows, time, excludeId) {
  return rows.find((r) => r.id !== excludeId && Math.abs(minutes(r.time) - minutes(time)) < SLOT_MINUTES);
}

/** Throws a user-facing message unless now is inside the check-in window for a slot. */
export function checkInWindowError(date, time) {
  const start = slotStart(date, time).getTime();
  const now = Date.now();
  if (now < start - CHECKIN_OPENS_MINUTES * 60000) return `Check-in opens ${CHECKIN_OPENS_MINUTES} minutes before the meeting starts`;
  if (now > start + GRACE_MINUTES * 60000) return 'Check-in has closed for this meeting';
  return null;
}

const who = { model: Startup, as: 'startup', attributes: ['id', 'startupName', 'createdById'] };
const mentorRef = { model: Mentor, as: 'mentor', attributes: ['id', 'userId'] };
const investorRef = { model: Investor, as: 'investor', attributes: ['id', 'userId'] };
const when = (date, time) => humanSlot(date, time);

let lastRun = 0;
let running = null;

/** Applies all automatic transitions. Throttled unless `force` — safe to call before every meeting list. */
export async function sweepMeetings({ force = false } = {}) {
  if (!force && Date.now() - lastRun < 20000) return running;
  lastRun = Date.now();
  running = (async () => {
    const grace = new Date(Date.now() - GRACE_MINUTES * 60000);
    const done = new Date(Date.now() - AUTO_COMPLETE_MINUTES * 60000);

    // Mentor meeting requests the mentor never answered.
    for (const r of await MeetingRequest.findAll({ where: { status: 'pending', ...startedBy(grace, 'requestedDate', 'requestedTime') }, include: [who, mentorRef] })) {
      await r.update({ status: 'expired', mentorNote: r.mentorNote || 'Expired automatically: it was not confirmed before the requested time.' });
      await notify([r.startup.createdById, r.mentor.userId], {
        message: `Meeting request for ${r.startup.startupName} on ${when(r.requestedDate, r.requestedTime)} expired: it wasn't confirmed in time.`, type: 'meeting', link: '/meetings',
      }, { email: false });
    }

    // Confirmed mentor meetings: nobody checked in → missed; checked in → completed after the session.
    for (const m of await Meeting.findAll({ where: { status: 'scheduled', checkedInAt: null, ...startedBy(grace) }, include: [who, mentorRef] })) {
      await m.update({ status: 'missed', notes: m.notes || `Cancelled automatically: no one checked in within ${GRACE_MINUTES} minutes of the start time.` });
      await notify([m.startup.createdById, m.mentor.userId], {
        message: `Meeting for ${m.startup.startupName} on ${when(m.date, m.time)} was marked as missed: no one checked in within ${GRACE_MINUTES} minutes.`, type: 'meeting', link: '/meetings',
      }, { email: false });
    }
    await Meeting.update({ status: 'completed' }, { where: { status: 'scheduled', checkedInAt: { [Op.ne]: null }, ...startedBy(done) } });

    // Investor meetings: same rules.
    for (const m of await InvestorMeeting.findAll({ where: { status: 'pending', ...startedBy(grace) }, include: [who, investorRef] })) {
      await m.update({ status: 'expired', note: m.note || 'Expired automatically: it was not confirmed before the meeting time.' });
      await notify([m.startup.createdById, m.investor.userId], {
        message: `Investor meeting request for ${m.startup.startupName} on ${when(m.date, m.time)} expired: it wasn't confirmed in time.`, type: 'investment', link: '/meetings',
      }, { email: false });
    }
    for (const m of await InvestorMeeting.findAll({ where: { status: 'accepted', checkedInAt: null, ...startedBy(grace) }, include: [who, investorRef] })) {
      await m.update({ status: 'missed', note: m.note || `Cancelled automatically: no one checked in within ${GRACE_MINUTES} minutes of the start time.` });
      await notify([m.startup.createdById, m.investor.userId], {
        message: `Investor meeting for ${m.startup.startupName} on ${when(m.date, m.time)} was marked as missed: no one checked in within ${GRACE_MINUTES} minutes.`, type: 'investment', link: '/meetings',
      }, { email: false });
    }
    await InvestorMeeting.update({ status: 'completed' }, { where: { status: 'accepted', checkedInAt: { [Op.ne]: null }, ...startedBy(done) } });
  })();
  try {
    await running;
  } finally {
    running = null;
  }
}

/** Express middleware: bring meeting statuses up to date before answering. */
export const sweepFirst = async (req, res, next) => {
  await sweepMeetings();
  next();
};
