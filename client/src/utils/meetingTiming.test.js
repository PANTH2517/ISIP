import { describe, expect, it } from 'vitest';
import { meetingTiming, GRACE_MINUTES, CHECKIN_OPENS_MINUTES } from './meetingTiming';

const at = (h, m) => new Date(2026, 9, 10, h, m).getTime(); // 10 Oct 2026, local time

describe('meetingTiming (check-in window around a 15:00 meeting)', () => {
  const slot = ['2026-10-10', '15:00'];

  it('uses a 15-minute early check-in and a 10-minute grace period', () => {
    expect(CHECKIN_OPENS_MINUTES).toBe(15);
    expect(GRACE_MINUTES).toBe(10);
  });

  it('is before the check-in window an hour earlier', () => {
    const t = meetingTiming(...slot, at(14, 0));
    expect(t.beforeCheckIn).toBe(true);
    expect(t.checkInOpen).toBe(false);
    expect(t.started).toBe(false);
    expect(t.isToday).toBe(true);
  });

  it('opens check-in 15 minutes before the start', () => {
    expect(meetingTiming(...slot, at(14, 44)).checkInOpen).toBe(false);
    expect(meetingTiming(...slot, at(14, 45)).checkInOpen).toBe(true);
  });

  it('keeps check-in open until 10 minutes after the start, then closes', () => {
    const during = meetingTiming(...slot, at(15, 5));
    expect(during.started).toBe(true);
    expect(during.checkInOpen).toBe(true);
    expect(meetingTiming(...slot, at(15, 11)).checkInOpen).toBe(false);
  });

  it('reports the opening and auto-cancel times for the UI hints', () => {
    const t = meetingTiming(...slot, at(14, 50));
    expect(t.opensAt.toLowerCase()).toMatch(/2:45\s?pm/);
    expect(t.deadlineAt.toLowerCase()).toMatch(/3:10\s?pm/);
  });

  it('knows when a meeting is on another day', () => {
    expect(meetingTiming('2026-10-12', '15:00', at(12, 0)).isToday).toBe(false);
  });
});
