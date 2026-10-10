import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Rocket, CalendarDays, IndianRupee, GraduationCap, Bell, UserCircle, Users, UserCheck, BarChart3,
  ScrollText, LogOut, Menu, X, Briefcase, Handshake, ChevronRight, Home, Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Avatar, Loading } from './ui';
import { firstName, timeAgo } from '../utils/format';
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
    { to: '/funding', label: 'Transactions', icon: IndianRupee },
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

const ROLE_LABEL = { student: 'Student Entrepreneur', mentor: 'Mentor', investor: 'Investor', admin: 'Program Manager' };

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
      <button onClick={() => { setOpen(!open); if (!open) load(); }} className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {data.unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            {data.unread > 0 && <button className="text-xs font-medium text-indigo-600 hover:underline" onClick={() => api.patch('/notifications/read-all').then(load)}>Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data.items.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up</p>}
            {data.items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${n.isRead ? '' : 'bg-indigo-50/60'}`}>
                <p className="text-sm text-slate-700">{n.message}</p>
                <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
              </button>
            ))}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 py-2.5 text-center text-sm font-semibold text-indigo-600 hover:bg-slate-50">View all notifications</Link>
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
    <nav className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
      <Link to="/dashboard" className="inline-flex items-center gap-1 hover:text-indigo-600"><Home className="h-3.5 w-3.5" />Home</Link>
      {section && section.to !== '/dashboard' && <>
        <ChevronRight className="h-3.5 w-3.5" />
        {deeper ? <Link to={section.to} className="hover:text-indigo-600">{section.label}</Link> : <span className="font-medium text-slate-700">{section.label}</span>}
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
      className={({ isActive }) => `mx-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );

  const sidebar = (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 shrink-0 items-center border-b border-slate-100 px-5"><Wordmark to="/dashboard" /></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto py-4" aria-label="App">
        <p className="px-6 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Menu</p>
        {items.map(link)}
        <p className="mt-5 px-6 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Account</p>
        {ACCOUNT.map(link)}
        <Link to="/" className="mx-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
          <Globe className="h-4 w-4" />Home page
        </Link>
      </nav>
      <div className="border-t border-slate-100 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={user.name} className="h-9 w-9 text-xs" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-slate-200 bg-white lg:hidden">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <button className="rounded-lg p-2 text-slate-700 hover:bg-slate-100" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <Wordmark to="/dashboard" />
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div className="relative w-72 max-w-[85%]">
              {sidebar}
              <button className="absolute right-2 top-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          </div>
        )}
        <main id="main-content" ref={mainRef} className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 lg:h-16 lg:px-8">
              {pathname === '/dashboard' ? <span className="text-sm font-semibold text-slate-900">Dashboard</span> : <Breadcrumb items={items} pathname={pathname} />}
              <div className="flex shrink-0 items-center gap-2">
                <NotificationBell />
                <Link to="/profile" className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-slate-100" aria-label="My profile">
                  <Avatar name={user.name} className="h-8 w-8 text-xs" />
                  <span className="hidden text-sm font-medium text-slate-700 md:inline">{firstName(user.name)}</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="flex-1 px-4 py-6 lg:px-8">
            <div className="mx-auto max-w-7xl"><Suspense fallback={<Loading />}><Outlet /></Suspense></div>
          </div>
        </main>
      </div>
    </div>
  );
}
