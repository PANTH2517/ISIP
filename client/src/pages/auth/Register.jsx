import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MailCheck, Rocket, UserCheck, Briefcase } from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { Button, Field } from '../../components/ui';
import AuthShell, { DevLink } from './AuthShell';
import { INVESTOR_TYPES } from '../../utils/format';

const ROLES = ['student', 'mentor', 'investor'];

export default function Register() {
  const [params] = useSearchParams();
  const roleParam = ROLES.includes(params.get('role')) ? params.get('role') : 'student';
  const [form, setForm] = useState({ role: roleParam, name: '', email: '', phone: '', password: '', confirm: '', expertise: '', bio: '', firmName: '', investorType: 'Angel', focusIndustries: '' });
  const [lastRoleParam, setLastRoleParam] = useState(roleParam);
  if (roleParam !== lastRoleParam) {
    setLastRoleParam(roleParam);
    setForm((f) => ({ ...f, role: roleParam }));
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      const { confirm: _confirm, ...body } = form;
      const { data } = await api.post('/auth/register', body);
      setDone(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell title={done.verified ? 'Account created' : 'Check your inbox'} footer={<Link to="/login" className="font-semibold text-indigo-600 hover:underline">{done.verified ? 'Log in now' : 'Back to login'}</Link>}>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          <MailCheck className="mb-2 h-6 w-6" />
          {done.message}
        </div>
        <DevLink link={done.devLink} label="Verify my email →" />
      </AuthShell>
    );
  }

  const roleBtn = (value, Icon, title, text) => (
    <button type="button" onClick={() => setForm({ ...form, role: value })}
      className={`flex-1 rounded-xl border-2 p-3 text-left transition ${form.role === value ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
      <Icon className={`mb-1 h-5 w-5 ${form.role === value ? 'text-indigo-600' : 'text-slate-400'}`} />
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-slate-500">{text}</p>
    </button>
  );

  return (
    <AuthShell title="Create your account" subtitle="Join your college's incubation program." footer={<>Already registered? <Link to="/login" className="font-semibold text-indigo-600 hover:underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
        <div className="grid grid-cols-3 gap-3">
          {roleBtn('student', Rocket, 'Student', 'I have a startup idea')}
          {roleBtn('mentor', UserCheck, 'Mentor', 'I want to guide startups')}
          {roleBtn('investor', Briefcase, 'Investor', 'I want to fund startups')}
        </div>
        <Field label="Full name" required><input className="input" required value={form.name} onChange={set('name')} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email" required><input className="input" type="email" required value={form.email} onChange={set('email')} /></Field>
          <Field label="Phone"><input className="input" type="tel" value={form.phone} onChange={set('phone')} /></Field>
        </div>
        {form.role === 'mentor' && (
          <>
            <Field label="Areas of expertise" hint="e.g. FinTech, Product, Fundraising"><input className="input" value={form.expertise} onChange={set('expertise')} /></Field>
            <Field label="Short bio"><textarea className="input" rows={2} value={form.bio} onChange={set('bio')} /></Field>
          </>
        )}
        {form.role === 'investor' && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Firm / fund name" hint="Leave blank if investing individually"><input className="input" value={form.firmName} onChange={set('firmName')} /></Field>
              <Field label="Investor type"><select className="input" value={form.investorType} onChange={set('investorType')}>{INVESTOR_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            </div>
            <Field label="Focus industries" hint="e.g. AgriTech, HealthTech, SaaS"><input className="input" value={form.focusIndustries} onChange={set('focusIndustries')} /></Field>
          </>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Password" required hint="Min 8 characters, a letter and a number"><input className="input" type="password" autoComplete="new-password" required value={form.password} onChange={set('password')} /></Field>
          <Field label="Confirm password" required><input className="input" type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} /></Field>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>Create account</Button>
      </form>
    </AuthShell>
  );
}
