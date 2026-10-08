export const inr = (n) =>
  n === null || n === undefined || n === '' ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const fmtDate = (d) =>
  d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

export function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [name, secs] of units) {
    const v = Math.floor(s / secs);
    if (v >= 1) return `${v} ${name}${v > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export const fileSize = (b) => (!b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

/** Today's date (YYYY-MM-DD) in the user's local timezone — toISOString() would give the UTC date. */
export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/** "1 startup", "3 startups" (pass the plural form for irregular words). */
export const plural = (n, word, pluralWord = `${word}s`) => `${n} ${Number(n) === 1 ? word : pluralWord}`;

export const INDUSTRIES = ['AgriTech', 'HealthTech', 'EdTech', 'FinTech', 'FoodTech', 'E-commerce', 'CleanTech', 'SaaS', 'AI / ML', 'Social Impact', 'Mobility', 'Other'];

/** First name, skipping honorifics like "Dr." */
export const firstName = (name = '') => name.split(' ').find((w) => w && !w.endsWith('.')) || name;

export const INVESTOR_TYPES = ['Angel', 'Angel Network', 'Venture Capital', 'Corporate', 'Government / Grant', 'Family Office'];
export const INSTRUMENTS = ['Equity', 'Convertible Note', 'SAFE', 'Debt', 'Grant'];

/** Investor ticket size: "₹2L – ₹25L", "Up to ₹25L", "From ₹2L". */
export function ticketRange(min, max) {
  if (min && max) return `${inrShort(min)} – ${inrShort(max)}`;
  if (max) return `Up to ${inrShort(max)}`;
  if (min) return `From ${inrShort(min)}`;
  return null;
}

/** Compact INR, e.g. ₹40K, ₹10L, ₹1.2Cr. */
export function inrShort(n) {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${+(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${+(v / 1e5).toFixed(2)}L`;
  if (v >= 1e3) return `₹${+(v / 1e3).toFixed(1)}K`;
  return inr(v);
}
