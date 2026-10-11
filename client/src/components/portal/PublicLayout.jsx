import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogIn, UserPlus, LayoutDashboard, Menu, X, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import TopBar, { TextSize } from './TopBar';
import Footer from './Footer';
import { Wordmark } from './Brand';
import IntroSplash, { replayIntro } from './IntroSplash';

const LINKS = [
  { href: '/', label: 'Home', exact: true },
  { href: '/#programmes', label: 'Programmes' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#events', label: 'Events & notices' },
  { href: '/#startups', label: 'Startups' },
  { href: '/#faq', label: 'FAQs' },
];

/** Tiny button that plays the intro animation again. */
function ReplayIntroButton({ onDark = false }) {
  return (
    <button type="button" onClick={replayIntro} title="Replay intro" aria-label="Replay intro"
      className={`flex h-6 w-6 items-center justify-center rounded-full transition ${onDark ? 'text-white/60 ring-1 ring-white/25 hover:bg-white/15 hover:text-white' : 'text-indigo-400 ring-1 ring-indigo-200 hover:bg-indigo-50 hover:text-indigo-800'}`}>
      <Play className="ml-px h-2.5 w-2.5 fill-current" />
    </button>
  );
}

/** Public site chrome: utility bar, masthead, navigation bar and institutional footer. */
export default function PublicLayout({ children }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-full flex-col bg-white">
      <IntroSplash auto={pathname === '/'} />
      <TopBar />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 lg:px-8">
          <Wordmark />
          <div className="hidden items-center gap-2 md:flex">
            <ReplayIntroButton />
            <TextSize className="mr-2 flex" />
            {user ? (
              <Link to="/dashboard" className="inline-flex items-center gap-2 h-9 rounded-md bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800">
                <LayoutDashboard className="h-4 w-4" />Go to my dashboard
              </Link>
            ) : <>
              <Link to="/login" className="inline-flex items-center gap-2 h-9 rounded-md border-2 border-indigo-700 px-4 text-sm font-semibold text-indigo-800 hover:bg-indigo-50">
                <LogIn className="h-4 w-4" />Login
              </Link>
              <Link to="/register" className="inline-flex items-center gap-2 h-9 rounded-md bg-saffron-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-saffron-600">
                <UserPlus className="h-4 w-4" />Register
              </Link>
            </>}
          </div>
          <button className="rounded p-2 text-indigo-900 hover:bg-slate-100 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        <nav className={`bg-indigo-900 ${open ? 'block' : 'hidden'} md:block`} aria-label="Main">
          <div className="mx-auto flex max-w-7xl flex-col px-4 md:flex-row md:items-center lg:px-8">
            {LINKS.map((l) => (l.exact ? (
              <NavLink key={l.href} to={l.href} end onClick={() => setOpen(false)}
                className={({ isActive }) => `border-b-2 px-4 py-3 text-sm font-medium transition hover:bg-white/10 hover:text-white ${isActive ? 'border-saffron-400 text-white' : 'border-transparent text-indigo-100'}`}>
                {l.label}
              </NavLink>
            ) : (
              <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-indigo-100 transition hover:bg-white/10 hover:text-white">{l.label}</Link>
            )))}
            <div className="flex flex-wrap items-center gap-2 py-3 md:hidden">
              <ReplayIntroButton onDark />
              <TextSize className="mr-2 flex" onDark />
              {user ? <Link to="/dashboard" className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-indigo-900">Go to my dashboard</Link> : <>
                <Link to="/login" className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-indigo-900">Login</Link>
                <Link to="/register" className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white">Register</Link>
              </>}
            </div>
          </div>
        </nav>
      </header>
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
