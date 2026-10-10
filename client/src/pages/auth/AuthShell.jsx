import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Wordmark } from '../../components/portal/Brand';
import { BRAND } from '../../config/brand';

const POINTS = [
  'Submit your startup and track its review',
  'Work with mentors on clear milestones',
  'Pitch to investors and close verified deals',
];

/** Auth pages (login, register, password reset, verification): brand panel + form. */
export default function AuthShell({ title, subtitle, children, footer }) {
  useEffect(() => {
    document.title = `${title} · ${BRAND.name}`;
  }, [title]);
  return (
    <div className="flex min-h-full bg-white">
      <aside className="relative hidden w-[42%] max-w-xl overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-accent-600 p-12 text-white lg:flex lg:flex-col">
        <div className="hero-pattern absolute inset-0" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative"><Wordmark inverse /></div>
        <div className="relative mt-auto">
          <p className="font-display text-4xl font-bold leading-tight">{BRAND.tagline}</p>
          <ul className="mt-8 space-y-3 text-indigo-50">
            {POINTS.map((p) => <li key={p} className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-white" />{p}</li>)}
          </ul>
        </div>
        <p className="relative mt-12 text-sm text-indigo-100">Need help? <a href={`mailto:${BRAND.support}`} className="font-medium text-white underline">{BRAND.support}</a></p>
      </aside>

      <main id="main-content" className="flex flex-1 flex-col px-4 py-8 sm:px-8">
        <div className="lg:hidden"><Wordmark /></div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-600">{footer}</div>}
        </div>
        <p className="text-center text-sm text-slate-400"><Link to="/" className="hover:text-indigo-600">← Back to {BRAND.name}</Link></p>
      </main>
    </div>
  );
}

export function DevLink({ link, label }) {
  if (!link) return null;
  const path = new URL(link).pathname + new URL(link).search;
  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
      <p className="font-semibold">Development mode: no email server configured</p>
      <p className="mt-1">The email was printed to the server console. You can also continue here:</p>
      <Link to={path} className="mt-2 inline-block font-semibold text-indigo-700 underline">{label}</Link>
    </div>
  );
}
