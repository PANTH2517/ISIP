import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Rocket, CalendarDays, IndianRupee, GraduationCap, Bell, UserCircle, Users, UserCheck, BarChart3,
  ScrollText, LogOut, Menu, X, Briefcase, Handshake, ChevronRight, Home, Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Avatar, Loading } from './ui';
import { timeAgo } from '../utils/format';
import TopBar, { TextSize } from './portal/TopBar';
import Footer from './portal/Footer';
import { Wordmark } from './portal/Brand';

const NAV = {
  student: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/startups', label: 'My Startups', icon: Rocket },
    { to: '/meetings', label: 'Meetings', icon: CalendarDays },
    { to: '/funding', label: 'Funding', icon: IndianRupee },
    { to: '/investors', label: 'Investors', icon: Briefcase },
    { to: '/workshops', label: 'Workshops & Events', icon: GraduationCap },
  ],
  mentor: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/startups', label: 'Assigned Startups', icon: Rocket },
    { to: '/meetings', label: 'Meetings', icon: CalendarDays },
  ],
  investor: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/startups', label: 'Browse Startups', icon: Rocket },
    { to: '/investor/deals', label: 'My Offers', icon: Handshake },
    { to: '/meetings', label: 'Meetings', icon: CalendarDays },
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/startups', label: 'Startups', icon: Rocket },
    { to: '/admin/mentors', label: 'Mentors', icon: UserCheck },
    { to: '/funding', label: 'Funding Requests', icon: IndianRupee },
    { to: '/workshops', label: 'Workshops & Events', icon: GraduationCap },
    { to: '/admin/investors', label: 'Investors', icon: Briefcase },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  ],
};
const ACCOUNT = [
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'My Profile', icon: UserCircle },
];

const ROLE_LABEL = { student: 'Student Entrepreneur', mentor: 'Mentor', investor: 'Investor', admin: 'Incubation Manager' };

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = () => api.get('/notifications?limit=6').then((r) => setData(r.data)).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.isRead) await api.patch(`/notifications/${n.id}/read`).catch(() => {});
    load();
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(!open); if (!open) load(); }} className="relative rounded-full border border-slate-200 p-2 text-indigo-900 hover:bg-indigo-50" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {data.unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-saffron-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between bg-indigo-900 px-4 py-2.5 text-white">
            <span className="text-sm font-semibold">Notifications</span>
            {data.unread > 0 && <button className="text-xs text-saffron-200 hover:underline" onClick={() => api.patch('/notifications/read-all').then(load)}>Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data.items.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up</p>}
            {data.items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${n.isRead ? '' : 'border-l-4 border-l-saffron-500 bg-saffron-50/50'}`}>
                <p className="text-sm text-slate-700">{n.message}</p>
                <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
              </button>
            ))}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 py-2.5 text-center text-sm font-semibold text-indigo-800 hover:bg-slate-50">View all notifications</Link>
        </div>
      )}
    </div>
  );
}

/** Breadcrumb from the current path: Home › Section › Details. */
function Breadcrumb({ items, pathname }) {
  const all = [...items, ...ACCOUNT, { to: '/people', label: 'People' }];
  const section = all.filter((i) => pathname === i.to || pathname.startsWith(`${i.to}/`)).sort((a, b) => b.to.length - a.to.length)[0];
  const deeper = section && pathname !== section.to;
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
      <Link to="/dashboard" className="inline-flex items-center gap-1 hover:text-indigo-800 hover:underline"><Home className="h-3.5 w-3.5" />Home</Link>
      {section && section.to !== '/dashboard' && <>
        <ChevronRight className="h-3.5 w-3.5" />
        {deeper ? <Link to={section.to} className="hover:text-indigo-800 hover:underline">{section.label}</Link> : <span className="font-medium text-slate-700">{section.label}</span>}
      </>}
      {deeper && <><ChevronRight className="h-3.5 w-3.5" /><span className="font-medium text-slate-700">{pathname.endsWith('/new') ? 'New' : pathname.endsWith('/edit') ? 'Edit' : 'Details'}</span></>}
    </nav>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  // The content pane scrolls independently of the window, so reset it when moving to another page.
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    setMobileOpen(false);
  }, [pathname]);
  const items = NAV[user.role];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const link = ({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) => `flex items-center gap-3 border-l-4 px-4 py-2.5 text-sm font-medium transition ${isActive
        ? 'border-saffron-500 bg-indigo-50 text-indigo-900'
        : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-indigo-900'}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );

  const sidebar = (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-900 to-indigo-800 px-4 py-4 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-saffron-300">{ROLE_LABEL[user.role]}</p>
        <p className="mt-0.5 truncate font-display text-base font-semibold">{user.name}</p>
        <p className="truncate text-xs text-indigo-200">{user.email}</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Portal">
        <p className="px-5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Services</p>
        {items.map(link)}
        <p className="mt-4 px-5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">My account</p>
        {ACCOUNT.map(link)}
        <Link to="/" className="flex items-center gap-3 border-l-4 border-transparent px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-900">
          <Globe className="h-4 w-4" />Public portal
        </Link>
      </nav>
      <div className="border-t border-slate-200 p-3">
        <div className="mb-3 flex items-center justify-between sm:hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Text size</span>
          <TextSize className="flex" />
        </div>
        <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-md border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 lg:px-6">
          <div className="flex items-center gap-2">
            <button className="rounded p-2 text-indigo-900 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <Wordmark to="/dashboard" compact />
          </div>
          <div className="flex items-center gap-3">
            <TextSize className="hidden sm:flex" />
            <NotificationBell />
            <Link to="/profile" className="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-slate-50">
              <Avatar name={user.name} className="h-9 w-9 text-xs" />
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold leading-tight text-slate-800">{user.name}</p>
                <p className="text-xs leading-tight text-saffron-700">{ROLE_LABEL[user.role]}</p>
              </div>
            </Link>
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div className="relative w-72 max-w-[85%]">
              {sidebar}
              <button className="absolute right-2 top-2 rounded p-1.5 text-white hover:bg-white/10" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          </div>
        )}
        <main id="main-content" ref={mainRef} className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {pathname !== '/dashboard' && (
            <div className="border-b border-slate-200 bg-white px-4 py-2.5 lg:px-8">
              <div className="mx-auto max-w-7xl"><Breadcrumb items={items} pathname={pathname} /></div>
            </div>
          )}
          <div className="flex-1 px-4 py-6 lg:px-8">
            <div className="mx-auto max-w-7xl"><Suspense fallback={<Loading />}><Outlet /></Suspense></div>
          </div>
          <Footer compact />
        </main>
      </div>
    </div>
  );
}
