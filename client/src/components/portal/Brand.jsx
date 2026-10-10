import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand';

/** StartIn emblem — a shield with a rocket (portal's own mark, not an official emblem). */
export function Emblem({ className = 'h-12 w-12' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M32 3 56 12v18c0 15.5-10.2 26.6-24 31C18.2 56.6 8 45.5 8 30V12z" fill="#0f2850" />
      <path d="M32 7.5 52 15v15c0 13-8.4 22.6-20 26.6C20.4 52.6 12 43 12 30V15z" fill="none" stroke="#f26b1d" strokeWidth="2" />
      <path d="M32 15c5.6 4 8.8 9.6 8.8 16.8L36.8 37h-9.6l-4-5.2C23.2 24.6 26.4 19 32 15z" fill="#fff" />
      <circle cx="32" cy="27.5" r="3.2" fill="#0f2850" />
      <path d="M27.2 40h9.6L32 47.5z" fill="#f26b1d" />
      <path d="M23.2 32.2 18.5 38l5.6-.6zM40.8 32.2l4.7 5.8-5.6-.6z" fill="#138808" />
    </svg>
  );
}

/** Emblem + wordmark used in the masthead. `inverse` for dark backgrounds. */
export function Wordmark({ to = '/', inverse = false, compact = false }) {
  return (
    <Link to={to} className="flex items-center gap-3" aria-label={`${BRAND.name} home`}>
      <Emblem className={compact ? 'h-10 w-10' : 'h-12 w-12 sm:h-14 sm:w-14'} />
      <div className="leading-tight">
        <p className={`font-display text-xl font-bold tracking-tight sm:text-2xl ${inverse ? 'text-white' : 'text-indigo-900'}`}>
          {BRAND.name}
          <span className={`ml-2 hidden align-middle text-xs font-semibold uppercase tracking-[0.18em] sm:inline ${inverse ? 'text-saffron-300' : 'text-saffron-600'}`}>Portal</span>
        </p>
        <p lang="hi" className={`hindi text-xs font-semibold sm:text-sm ${inverse ? 'text-saffron-200' : 'text-saffron-700'}`}>{BRAND.fullNameHi}</p>
        <p className={`text-xs font-medium sm:text-sm ${inverse ? 'text-indigo-100' : 'text-slate-600'}`}>{BRAND.fullName}</p>
        {!compact && <p className={`hidden text-[11px] lg:block ${inverse ? 'text-indigo-200' : 'text-slate-500'}`}>{BRAND.cell} · {BRAND.institute}</p>}
      </div>
    </Link>
  );
}
