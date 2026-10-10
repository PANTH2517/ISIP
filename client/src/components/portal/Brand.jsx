import { useId } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand';

/** StartIn logo mark: a rocket on a rounded gradient tile. */
export function Emblem({ className = 'h-10 w-10' }) {
  // Unique per instance: a gradient defined inside a hidden copy of the logo can't be referenced by a visible one.
  const id = `logo${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id})`} />
      <path d="M32 13c6.4 4.6 10 11 10 19.2l-4.6 6h-10.8l-4.6-6C22 24 25.6 17.6 32 13z" fill="#fff" />
      <circle cx="32" cy="27" r="3.6" fill="#6366f1" />
      <path d="M27 42h10l-5 8z" fill="#fff" opacity=".85" />
    </svg>
  );
}

/** Logo + product name. `inverse` for dark backgrounds. */
export function Wordmark({ to = '/', inverse = false }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label={`${BRAND.name} home`}>
      <Emblem className="h-9 w-9" />
      <span className={`font-display text-xl font-extrabold tracking-tight ${inverse ? 'text-white' : 'text-slate-900'}`}>{BRAND.name}</span>
    </Link>
  );
}
