import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Rocket, CalendarDays, IndianRupee, GraduationCap, Bell, UserCircle, Users, UserCheck, BarChart3,
  ScrollText, LogOut, Menu, X, Briefcase, Handshake,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Avatar, Loading } from './ui';
import { firstName, timeAgo } from '../utils/format';

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
      <button onClick={() => { setOpen(!open); if (!open) load(); }} className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {data.unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {data.unread > 0 && <button className="text-xs text-indigo-600 hover:underline" onClick={() => api.patch('/notifications/read-all').then(load)}>Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data.items.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up</p>}
            {data.items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)} className={`block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${n.isRead ? '' : 'bg-indigo-50/50'}`}>
                <p className="text-sm text-slate-700">{n.message}</p>
                <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
              </button>
            ))}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 py-2.5 text-center text-sm font-medium text-indigo-600 hover:bg-slate-50">View all</Link>
        </div>
      )}
    </div>
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
  }, [pathname]);
  const items = [...NAV[user.role], { to: '/notifications', label: 'Notifications', icon: Bell }, { to: '/profile', label: 'My Profile', icon: UserCircle }];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <Link to="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
        <img src="/favicon.svg" alt="" className="h-8 w-8" />
        <div>
          <p className="font-bold leading-tight text-white">StartIn</p>
          <p className="text-[11px] leading-tight text-slate-400">Startup Incubation Platform</p>
        </div>
      </Link>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-800 hover:text-white">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="w-64">{sidebar}</div>
          <div className="flex-1 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          <button className="rounded p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden text-sm text-slate-500 lg:block">Welcome back, <span className="font-medium text-slate-800">{firstName(user.name)}</span></div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link to="/profile" className="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-slate-50">
              <Avatar name={user.name} className="h-8 w-8 text-xs" />
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight text-slate-800">{user.name}</p>
                <p className="text-xs leading-tight text-slate-500">{ROLE_LABEL[user.role]}</p>
              </div>
            </Link>
          </div>
        </header>
        <main ref={mainRef} className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-7xl"><Suspense fallback={<Loading />}><Outlet /></Suspense></div>
        </main>
      </div>
    </div>
  );
}
