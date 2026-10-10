import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Footer from './Footer';
import { Wordmark } from './Brand';

const LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#startups', label: 'Startups' },
  { href: '/#events', label: 'Events' },
  { href: '/#faq', label: 'FAQ' },
];

/** Public site chrome: sticky top bar and footer. */
export default function PublicLayout({ children }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const cta = user ? (
    <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
      <LayoutDashboard className="h-4 w-4" />Dashboard
    </Link>
  ) : <>
    <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Log in</Link>
    <Link to="/register" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">Get started</Link>
  </>;

  return (
    <div className="flex min-h-full flex-col bg-white">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-1 focus:shadow">Skip to main content</a>
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <Wordmark />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {LINKS.map((l) => (
              <Link key={l.href} to={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">{l.label}</Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">{cta}</div>
          <button className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden" aria-label="Main">
            {LINKS.map((l) => (
              <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">{l.label}</Link>
            ))}
            <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">{cta}</div>
          </nav>
        )}
      </header>
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
