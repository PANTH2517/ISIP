import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand';

/**
 * StartIn logo: a light bulb whose filament is a growing sapling (an idea nurtured into a venture), on a navy tile. On navy surfaces pass `onDark`
 * to set it on a light tile so the edge stays visible.
 */
export function Emblem({ className = 'h-12 w-12', onDark = false }) {
  const img = <img src="/logo.svg" alt="" width="64" height="64" className={onDark ? 'h-full w-full object-contain' : `${className} object-contain`} draggable="false" />;
  return onDark ? <span className={`${className} inline-flex shrink-0 items-center justify-center rounded-xl bg-white p-0.5 shadow-sm`}>{img}</span> : img;
}

/** Emblem + wordmark used in the masthead. `inverse` for dark backgrounds. */
export function Wordmark({ to = '/', inverse = false, compact = false }) {
  return (
    <Link to={to} className="flex items-center gap-3" aria-label={`${BRAND.name} home`}>
      <Emblem className={compact ? 'h-10 w-10' : 'h-11 w-11 sm:h-12 sm:w-12'} />
      <div className="leading-tight">
        <p className={`font-display text-lg font-bold tracking-tight sm:text-xl ${inverse ? 'text-white' : 'text-indigo-900'}`}>
          {BRAND.name}
          <span className={`ml-2 hidden align-middle text-xs font-semibold uppercase tracking-[0.18em] sm:inline ${inverse ? 'text-saffron-300' : 'text-saffron-600'}`}>Portal</span>
        </p>
        <p className={`text-xs font-medium ${inverse ? 'text-indigo-100' : 'text-slate-600'}`}>{BRAND.fullName}</p>
      </div>
    </Link>
  );
}
