import { describe, expect, it, vi, afterEach } from 'vitest';
import { inr, inrShort, plural, ticketRange, firstName, fmtTime, fileSize, todayISO, fmtDate } from './format';

describe('money formatting', () => {
  it('formats rupees with Indian digit grouping', () => {
    expect(inr(1200000)).toBe('₹12,00,000');
    expect(inr(0)).toBe('₹0');
    expect(inr(null)).toBe('—');
    expect(inr('')).toBe('—');
  });

  it('uses short forms (K / L / Cr) for compact display', () => {
    expect(inrShort(40000)).toBe('₹40K');
    expect(inrShort(1200000)).toBe('₹12L');
    expect(inrShort(250000)).toBe('₹2.5L');
    expect(inrShort(25000000)).toBe('₹2.5Cr');
    expect(inrShort(999)).toBe('₹999');
    expect(inrShort(null)).toBe('₹0');
  });

  it('describes investor ticket ranges, including open-ended ones', () => {
    expect(ticketRange(200000, 2500000)).toBe('₹2L – ₹25L');
    expect(ticketRange(null, 2500000)).toBe('Up to ₹25L');
    expect(ticketRange(200000, null)).toBe('From ₹2L');
    expect(ticketRange(null, null)).toBeNull();
  });
});

describe('text helpers', () => {
  it('pluralises counts', () => {
    expect(plural(1, 'startup')).toBe('1 startup');
    expect(plural(0, 'startup')).toBe('0 startups');
    expect(plural(3, 'deal')).toBe('3 deals');
    expect(plural(2, 'company', 'companies')).toBe('2 companies');
  });

  it('skips honorifics when picking a first name', () => {
    expect(firstName('Dr. Kavita Rao')).toBe('Kavita');
    expect(firstName('Aarav Patel')).toBe('Aarav');
  });

  it('formats times and file sizes', () => {
    expect(fmtTime('16:30').toLowerCase()).toMatch(/4:30\s?pm/);
    expect(fmtTime('')).toBe('');
    expect(fileSize(500)).toBe('1 KB');
    expect(fileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('formats date-only values without timezone shifts', () => {
    expect(fmtDate('2026-10-03')).toMatch(/3 Oct 2026/);
    expect(fmtDate(null)).toBe('—');
  });
});

describe('todayISO', () => {
  afterEach(() => vi.useRealTimers());

  it("returns the local calendar date, not the UTC one", () => {
    vi.useFakeTimers();
    // 00:30 local time on 5 Oct — in UTC+5:30 this is still 4 Oct in UTC.
    vi.setSystemTime(new Date(2026, 9, 5, 0, 30));
    expect(todayISO()).toBe('2026-10-05');
  });
});
