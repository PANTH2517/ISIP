import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { firstName } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { Button, Field } from '../../components/ui';
import AuthShell, { DevLink } from './AuthShell';
import { postLoginPath } from '../../utils/redirect';

// Demo accounts created by the server seed script (server/src/seed.js).
const DEMO = [
  { label: 'Student', email: 'aarav.student@isip.edu', password: 'Password@123' },
  { label: 'Mentor', email: 'priya.mentor@isip.edu', password: 'Password@123' },
  { label: 'Investor', email: 'vikram.investor@isip.edu', password: 'Password@123' },
  { label: 'Admin', email: 'admin@isip.edu', password: 'Admin@123' },
];

/**
 * Temporary lab-demo logins for the live site, read from the VITE_DEMO_LOGINS build variable (set in Vercel, never
 * committed): "email:password" pairs separated by commas. Remove the variable and redeploy to hide the button.
 */
function liveDemoLogins(raw = import.meta.env.VITE_DEMO_LOGINS) {
  return String(raw || '').split(',').map((pair) => {
    const [email, ...rest] = pair.trim().split(':');
    const local = (email || '').split('@')[0] || '';
    const role = local.includes('.') ? local.split('.').pop() : local;
    return { label: role.charAt(0).toUpperCase() + role.slice(1), email: email?.trim(), password: rest.join(':').trim() };
  }).filter((d) => d.email && d.password);
}
const LIVE_DEMO = liveDemoLogins();

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(params.get('expired') ? 'Your session expired. Please log in again.' : '');
  const [unverified, setUnverified] = useState(false);
  const [devLink, setDevLink] = useState(null);
  const [showDemo, setShowDemo] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUnverified(false);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome, ${firstName(user.name)}!`);
      navigate(postLoginPath(location), { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setUnverified(!!err.response?.data?.needsVerification);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      const { data } = await api.post('/auth/resend-verification', { email: form.email });
      toast.success(data.message);
      setDevLink(data.devLink);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <AuthShell title="Log in to StartIn" subtitle="Manage your startup journey, mentorship and funding." footer={<>New here? <Link to="/register" className="font-semibold text-indigo-600 hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            {error}
            {unverified && <button type="button" onClick={resend} className="ml-1 font-semibold underline">Resend verification email</button>}
          </div>
        )}
        <DevLink link={devLink} label="Verify my email →" />
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password">
          <input className="input" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>Log in</Button>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts (development)</p>
          <div className="flex flex-wrap gap-2">
            {DEMO.map((d) => (
              <Button key={d.label} type="button" size="sm" variant="soft" onClick={() => setForm({ email: d.email, password: d.password })}>{d.label}</Button>
            ))}
          </div>
        </div>
      )}

      {LIVE_DEMO.length > 0 && (
        <div className="mt-6 flex flex-col items-end">
          <button type="button" onClick={() => setShowDemo((v) => !v)} title="Demo credentials" aria-label="Demo credentials" aria-expanded={showDemo}
            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-300 transition hover:bg-slate-100 hover:text-slate-500">
            <KeyRound className="h-3.5 w-3.5" />
          </button>
          {showDemo && (
            <div className="mt-2 flex w-full flex-wrap justify-end gap-2">
              {LIVE_DEMO.map((d) => (
                <Button key={d.email} type="button" size="sm" variant="soft" title={d.email} onClick={() => { setForm({ email: d.email, password: d.password }); setShowDemo(false); }}>{d.label}</Button>
              ))}
            </div>
          )}
        </div>
      )}
    </AuthShell>
  );
}
