import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Target, IndianRupee, Users } from 'lucide-react';

const YEAR = new Date().getFullYear();

const FEATURES = [
  { icon: Rocket, text: 'Submit your startup idea and track it from Pending to Incubated' },
  { icon: Users, text: 'Get matched with mentors, book meetings and receive feedback' },
  { icon: Target, text: 'Hit milestones — Idea Validation → Prototype → MVP → Revenue' },
  { icon: IndianRupee, text: 'Apply for seed funding and track every request in one place' },
];

export default function AuthShell({ title, subtitle, children, footer }) {
  useEffect(() => {
    document.title = `${title} · StartIn`;
  }, [title]);
  return (
    <div className="flex min-h-full">
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />
        <Link to="/" className="relative flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-10 w-10 rounded-lg ring-2 ring-white/30" />
          <div>
            <p className="text-xl font-bold">StartIn</p>
            <p className="text-sm text-indigo-100">Intelligent Startup Incubation Platform</p>
          </div>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight">Your campus incubator,<br />all in one place.</h2>
          <p className="mt-3 max-w-md text-indigo-100">No more scattered Google Forms, emails and spreadsheets. StartIn digitises the entire incubation workflow.</p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="rounded-lg bg-white/15 p-2"><Icon className="h-4 w-4" /></span>
                <span className="pt-1 text-sm text-indigo-50">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-indigo-200">© {YEAR} StartIn · ISIP</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="text-lg font-bold">StartIn</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function DevLink({ link, label }) {
  if (!link) return null;
  const path = new URL(link).pathname + new URL(link).search;
  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
      <p className="font-semibold">Development mode — no email server configured</p>
      <p className="mt-1">The email was printed to the server console. You can also continue here:</p>
      <Link to={path} className="mt-2 inline-block font-semibold text-indigo-700 underline">{label}</Link>
    </div>
  );
}
