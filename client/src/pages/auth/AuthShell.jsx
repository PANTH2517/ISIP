import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Info, ShieldCheck, Mail, ChevronRight, Lock } from 'lucide-react';
import PublicLayout from '../../components/portal/PublicLayout';
import { BRAND } from '../../config/brand';

const INSTRUCTIONS = [
  'Use your institute email address where possible. One account per person.',
  'Verify your email from the link we send before logging in.',
  'Student entrepreneurs can submit startups; mentors and investors are verified by the Incubation Cell.',
  'Never share your password. Staff will never ask for it.',
];

/** Auth pages (login, register, password reset, verification) inside the public portal chrome. */
export default function AuthShell({ title, subtitle, children, footer }) {
  useEffect(() => {
    document.title = `${title} · ${BRAND.name}`;
  }, [title]);
  return (
    <PublicLayout>
      <div className="border-b border-slate-200 bg-slate-50">
        <nav className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 py-2.5 text-xs text-slate-500 lg:px-8" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-indigo-800 hover:underline">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-slate-700">{title}</span>
        </nav>
      </div>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-5 lg:px-8 lg:py-14">
        <section className="lg:col-span-3">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b-4 border-saffron-500 bg-indigo-900 px-6 py-4">
              <Lock className="h-5 w-5 text-saffron-300" />
              <div>
                <h1 className="font-display text-xl font-bold text-white">{title}</h1>
                {subtitle && <p className="text-sm text-indigo-200">{subtitle}</p>}
              </div>
            </div>
            <div className="px-6 py-7 sm:px-8">{children}</div>
            {footer && <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-center text-sm text-slate-600">{footer}</div>}
          </div>
        </section>
        <aside className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50/60">
            <div className="flex items-center gap-2 border-b border-indigo-100 px-5 py-3"><Info className="h-4 w-4 text-indigo-800" /><h2 className="text-sm font-bold uppercase tracking-wide text-indigo-900">Important instructions</h2></div>
            <ol className="list-decimal space-y-2.5 px-5 py-4 pl-9 text-sm text-slate-700">
              {INSTRUCTIONS.map((t) => <li key={t}>{t}</li>)}
            </ol>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-indigo-900"><ShieldCheck className="h-4 w-4 text-[#16a34a]" />Secure portal</div>
            <p className="mt-2 text-sm text-slate-600">Sessions are protected with signed tokens, passwords are hashed, and every action is audit-logged.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-indigo-900"><Mail className="h-4 w-4 text-saffron-600" />Need help?</div>
            <p className="mt-2 text-sm text-slate-600">Write to <a href={`mailto:${BRAND.helpdesk}`} className="font-medium text-indigo-800 underline">{BRAND.helpdesk}</a> ({BRAND.hours}).</p>
          </div>
        </aside>
      </div>
    </PublicLayout>
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
