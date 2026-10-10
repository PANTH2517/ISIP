import { useEffect, useState } from 'react';

// Must match server/src/services/meetingLifecycle.js
export const GRACE_MINUTES = 10;
export const CHECKIN_OPENS_MINUTES = 15;

const clock = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/** Where a meeting slot is in its lifecycle right now. */
export function meetingTiming(date, time, now = Date.now()) {
  const start = new Date(`${date}T${time}:00`).getTime();
  const deadline = start + GRACE_MINUTES * 60000;
  const opens = start - CHECKIN_OPENS_MINUTES * 60000;
  return {
    started: now >= start,
    checkInOpen: now >= opens && now <= deadline,
    beforeCheckIn: now < opens,
    isToday: new Date(start).toDateString() === new Date(now).toDateString(),
    opensAt: clock(opens),
    startsAt: clock(start),
    deadlineAt: clock(deadline),
  };
}

/** Re-renders every `ms` so time-based buttons and hints stay current. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Calls `fn` every `ms` (used to pick up automatic expiries from the server). */
export function useInterval(fn, ms = 60000) {
  useEffect(() => {
    const t = setInterval(fn, ms);
    return () => clearInterval(t);
  }, [fn, ms]);
}

export const MEETING_KINDS = { pitch: 'Pitch', intro: 'Intro call', due_diligence: 'Due diligence', follow_up: 'Follow-up' };
