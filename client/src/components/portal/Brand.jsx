import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand';

/**
 * StartIn logo (lightbulb with a rocket). The artwork's glow is designed for light backgrounds, so on dark
 * surfaces pass `onDark` to show it on a light tile.
 */
export function Emblem({ className = 'h-12 w-12', onDark = false }) {
  const img = <img src="/logo-192.png" alt="" width="192" height="192" className={onDark ? 'h-full w-full object-contain' : `${className} object-contain`} draggable="false" />;
  return onDark ? <span className={`${className} inline-flex shrink-0 items-center justify-center rounded-xl bg-white p-0.5 shadow-sm`}>{img}</span> : img;
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
        <p className={`text-xs font-medium sm:text-sm ${inverse ? 'text-indigo-100' : 'text-slate-600'}`}>{BRAND.fullName}</p>
        {!compact && <p className={`hidden text-[11px] lg:block ${inverse ? 'text-indigo-200' : 'text-slate-500'}`}>{BRAND.cell} · {BRAND.institute}</p>}
      </div>
    </Link>
  );
}
