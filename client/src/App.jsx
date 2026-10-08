import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Loading } from './components/ui';
import Login from './pages/auth/Login';

const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const Dashboard = lazy(() => import('./pages/dashboards/Dashboard'));
const StartupList = lazy(() => import('./pages/startups/StartupList'));
const StartupForm = lazy(() => import('./pages/startups/StartupForm'));
const StartupDetail = lazy(() => import('./pages/startups/StartupDetail'));
const Meetings = lazy(() => import('./pages/Meetings'));
const Funding = lazy(() => import('./pages/Funding'));
const Workshops = lazy(() => import('./pages/Workshops'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const Users = lazy(() => import('./pages/admin/Users'));
const Mentors = lazy(() => import('./pages/admin/Mentors'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));
const Investors = lazy(() => import('./pages/admin/Investors'));
const Deals = lazy(() => import('./pages/investor/Deals'));
const PersonProfile = lazy(() => import('./pages/PersonProfile'));
const InvestorDirectory = lazy(() => import('./pages/InvestorDirectory'));

function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading text="Loading StartIn…" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/startups" element={<StartupList />} />
          <Route path="/startups/new" element={<RequireAuth roles={['student']}><StartupForm /></RequireAuth>} />
          <Route path="/startups/:id/edit" element={<RequireAuth roles={['student', 'admin']}><StartupForm /></RequireAuth>} />
          <Route path="/startups/:id" element={<StartupDetail />} />
          <Route path="/mentor/startups" element={<Navigate to="/startups" replace />} />
          <Route path="/meetings" element={<RequireAuth roles={['student', 'mentor', 'investor', 'admin']}><Meetings /></RequireAuth>} />
          <Route path="/investor/deals" element={<RequireAuth roles={['investor']}><Deals /></RequireAuth>} />
          <Route path="/funding" element={<RequireAuth roles={['student', 'admin']}><Funding /></RequireAuth>} />
          <Route path="/admin/funding" element={<Navigate to="/funding" replace />} />
          <Route path="/workshops" element={<RequireAuth roles={['student', 'admin']}><Workshops /></RequireAuth>} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/people/:id" element={<PersonProfile />} />
          <Route path="/investors" element={<RequireAuth roles={['student']}><InvestorDirectory /></RequireAuth>} />
          <Route path="/admin/users" element={<RequireAuth roles={['admin']}><Users /></RequireAuth>} />
          <Route path="/admin/mentors" element={<RequireAuth roles={['admin']}><Mentors /></RequireAuth>} />
          <Route path="/admin/reports" element={<RequireAuth roles={['admin']}><Reports /></RequireAuth>} />
          <Route path="/admin/audit" element={<RequireAuth roles={['admin']}><AuditLog /></RequireAuth>} />
          <Route path="/admin/investors" element={<RequireAuth roles={['admin']}><Investors /></RequireAuth>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
