export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/** Throws a 400 listing any fields in `body` that are missing or blank. */
export function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  if (missing.length) throw new HttpError(400, `Missing required field(s): ${missing.join(', ')}`);
}

/** Returns an object with only the listed keys that are present in `body`. */
export function pick(body, keys) {
  const out = {};
  for (const k of keys) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

const pad = (n) => String(n).padStart(2, '0');
/** Today's date (YYYY-MM-DD) in the server's local timezone (toISOString() would give the UTC date). */
/** Upper bound for any rupee amount (₹1,000 crore) — catches typos like an extra few zeros. */
export const MAX_AMOUNT = 1e10;
export function parseAmount(value, label = 'Amount') {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, `${label} must be a positive number`);
  if (n > MAX_AMOUNT) throw new HttpError(400, `${label} looks too large (maximum ₹1,000 crore)`);
  return Math.round(n * 100) / 100;
}

/** YYYY-MM-DD of a date in the app's time zone (toISOString() would give the UTC day). */
export const localDay = (value = new Date()) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const today = () => localDay();
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Validates a future meeting slot (YYYY-MM-DD, HH:MM). */
export function validateSlot(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new HttpError(400, 'Please choose a valid date');
  if (!TIME.test(time || '')) throw new HttpError(400, 'Please choose a valid time (HH:MM)');
  if (date < today() || (date === today() && time <= nowTime())) throw new HttpError(400, 'Meetings cannot be scheduled in the past');
}

/** "3 Oct 2026" from YYYY-MM-DD (used in notification text). */
export function humanDate(date) {
  if (!date) return '';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "3 Oct 2026, 8:06 am" from YYYY-MM-DD + HH:MM. */
export function humanSlot(date, time) {
  if (!time) return humanDate(date);
  const t = new Date(`${date}T${time}:00`).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `${humanDate(date)}, ${t}`;
}
