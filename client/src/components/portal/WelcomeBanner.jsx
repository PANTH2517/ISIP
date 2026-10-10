import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BRAND } from '../../config/brand';

const ROLE_LABEL = { student: 'Student Entrepreneur', mentor: 'Mentor', investor: 'Investor', admin: 'Program Manager' };

/** Dashboard header band: greeting, role, today's date and primary actions. */
export default function WelcomeBanner({ title, subtitle, actions }) {
  const { user } = useAuth();
  useEffect(() => {
    document.title = `Dashboard · ${BRAND.name}`;
  }, []);
  const [today] = useState(() => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-accent-600 px-6 py-7 text-white shadow-lg shadow-indigo-200">
      <div className="hero-pattern absolute inset-0" />
      <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-100">
            {ROLE_LABEL[user?.role]} dashboard
            <span className="inline-flex items-center gap-1 normal-case tracking-normal text-indigo-200"><CalendarDays className="h-3.5 w-3.5" />{today}</span>
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-bold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-indigo-100">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
