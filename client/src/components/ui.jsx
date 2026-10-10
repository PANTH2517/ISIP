import { useEffect } from 'react';
import { Loader2, X, Star } from 'lucide-react';

const cx = (...c) => c.filter(Boolean).join(' ');

const VARIANTS = {
  primary: 'bg-indigo-700 text-white hover:bg-indigo-800 shadow-sm',
  accent: 'bg-saffron-500 text-white hover:bg-saffron-600 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100',
  soft: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
};

export function Button({ variant = 'primary', size = 'md', loading, icon: Icon, className, children, disabled, ...props }) {
  const sizes = { sm: 'px-2.5 py-1.5 text-xs gap-1.5', md: 'px-3.5 py-2 text-sm gap-2', lg: 'px-5 py-2.5 text-sm gap-2' };
  return (
    <button
      className={cx('inline-flex items-center justify-center rounded-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-60', VARIANTS[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {children}
    </button>
  );
}

export function Card({ title, subtitle, action, children, className, bodyClassName }) {
  return (
    <section className={cx('overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3">
          <div className="border-l-4 border-saffron-500 pl-3">
            {title && <h3 className="font-semibold text-indigo-950">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cx('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

const BADGE_COLORS = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200',
};

export function Badge({ color = 'gray', children, className }) {
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', BADGE_COLORS[color], className)}>{children}</span>;
}

const STATUS = {
  draft: ['gray', 'Draft'], pending: ['yellow', 'Pending'], approved: ['green', 'Approved'], incubated: ['purple', 'Incubated'],
  rejected: ['red', 'Rejected'], in_progress: ['blue', 'In progress'], submitted: ['indigo', 'Awaiting review'], completed: ['green', 'Completed'],
  modification_requested: ['yellow', 'Changes requested'], accepted: ['green', 'Accepted'], rescheduled: ['blue', 'Rescheduled'],
  scheduled: ['indigo', 'Scheduled'], cancelled: ['red', 'Cancelled'], upcoming: ['indigo', 'Upcoming'], assigned: ['yellow', 'Awaiting acceptance'],
  registered: ['blue', 'Registered'], present: ['green', 'Present'], absent: ['red', 'Absent'], active: ['green', 'Active'], inactive: ['red', 'Inactive'],
  declined: ['red', 'Declined'], withdrawn: ['gray', 'Withdrawn'], expired: ['gray', 'Expired'], missed: ['red', 'Missed'],
};

export function StatusBadge({ status }) {
  const [color, label] = STATUS[status] || ['gray', status];
  return <Badge color={color}>{label}</Badge>;
}

/** Incubation Cell review of an accepted investor deal. */
const CLEARANCE = {
  under_review: ['indigo', 'Under review'], on_hold: ['yellow', 'On hold'], cleared: ['green', 'Cleared'], cancelled: ['red', 'Cancelled'],
};
export function ClearanceBadge({ clearance }) {
  if (!clearance) return null;
  const [color, label] = CLEARANCE[clearance] || ['gray', clearance];
  return <Badge color={color}>{label}</Badge>;
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[8vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div className={cx('w-full overflow-hidden rounded-lg bg-white shadow-2xl', widths[size])} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b-4 border-saffron-500 bg-indigo-900 px-5 py-3.5">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-indigo-200 hover:bg-white/10 hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, required, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="label">{label}{required && <span className="text-rose-500"> *</span>}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function ProgressBar({ value = 0, className, showLabel = true }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const color = v >= 75 ? 'bg-[#16a34a]' : v >= 40 ? 'bg-indigo-700' : 'bg-saffron-500';
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={cx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${v}%` }} />
      </div>
      {showLabel && <span className="w-10 text-right text-xs font-semibold text-slate-600">{v}%</span>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: ['bg-indigo-50 text-indigo-800', 'border-l-indigo-700'], green: ['bg-emerald-50 text-emerald-700', 'border-l-[#16a34a]'],
    amber: ['bg-saffron-50 text-saffron-600', 'border-l-saffron-500'], rose: ['bg-rose-50 text-rose-600', 'border-l-rose-500'],
    sky: ['bg-sky-50 text-sky-700', 'border-l-sky-600'], violet: ['bg-violet-50 text-violet-700', 'border-l-violet-600'],
  };
  const [iconTone, stripe] = colors[color] || colors.indigo;
  return (
    <div className={cx('flex items-center gap-4 rounded-lg border border-l-4 border-slate-200 bg-white p-4 shadow-sm', stripe)}>
      {Icon && <div className={cx('shrink-0 rounded-full p-2.5', iconTone)}><Icon className="h-5 w-5" /></div>}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase leading-snug tracking-wide text-slate-500">{label}</p>
        <p className="truncate font-display text-2xl font-bold text-indigo-950" title={typeof value === 'string' ? value : undefined}>{value}</p>
        {sub && <p className="text-xs leading-snug text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  useEffect(() => {
    document.title = `${title} · StartIn`;
  }, [title]);
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-indigo-950">{title}</h1>
        <div className="mt-2 h-1 w-14 rounded-full bg-saffron-500" aria-hidden="true" />
        {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={cx('h-5 w-5 animate-spin text-indigo-600', className)} />;
}

export function Loading({ text = 'Loading…' }) {
  return <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500"><Spinner />{text}</div>;
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {error}
      {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      {Icon && <div className="mb-3 rounded-full bg-indigo-50 p-3 text-indigo-700"><Icon className="h-6 w-6" /></div>}
      <p className="font-medium text-slate-700">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b-2 border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cx('-mb-0.5 flex items-center gap-2 whitespace-nowrap border-b-[3px] px-3.5 py-2.5 text-sm font-semibold transition',
            active === t.id ? 'border-saffron-500 bg-white text-indigo-900' : 'border-transparent text-slate-500 hover:text-indigo-900')}
        >
          {t.icon && <t.icon className="h-4 w-4" />}
          {t.label}
          {t.count ? <span className="rounded-full bg-saffron-500 px-1.5 text-xs font-semibold text-white">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Stars({ value = 0, onChange, size = 'h-4 w-4' }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} className={cx(onChange ? 'cursor-pointer' : 'cursor-default')} aria-label={`${n} star`}>
          <Star className={cx(size, n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, className }) {
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-900 text-sm font-semibold text-white ring-2 ring-saffron-200', className)}>{initials}</div>;
}

export function InfoRow({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm text-slate-800">{children || <span className="text-slate-400">Not provided</span>}</dd>
    </div>
  );
}
