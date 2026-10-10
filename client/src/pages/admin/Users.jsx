import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, UserX, UserCheck } from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { Avatar, Badge, Button, Card, EmptyState, ErrorBox, Field, Loading, Modal, PageHeader, StatusBadge } from '../../components/ui';
import { fmtDate } from '../../utils/format';
import PersonLink from '../../components/PersonLink';

const ROLES = { student: 'Student', mentor: 'Mentor', investor: 'Investor', admin: 'Admin' };

function CreateUser({ role = 'mentor', onClose, onDone }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role, password: '', expertise: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success('User created (active and verified)');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title="Add user">
      <form onSubmit={save} className="space-y-4">
        <Field label="Role"><select className="input" value={form.role} onChange={set('role')}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Full name" required><input className="input" required value={form.name} onChange={set('name')} /></Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email" required><input className="input" type="email" required value={form.email} onChange={set('email')} /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
        </div>
        {form.role === 'mentor' && <Field label="Expertise"><input className="input" value={form.expertise} onChange={set('expertise')} /></Field>}
        {form.role === 'investor' && <Field label="Firm / fund name"><input className="input" value={form.firmName || ''} onChange={set('firmName')} /></Field>}
        <Field label="Temporary password" required hint="Share it with the user; they can change it from their profile"><input className="input" required minLength={8} value={form.password} onChange={set('password')} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>Create user</Button></div>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  // ?add=mentor / ?add=investor (from the Mentors / Investors pages) opens the form with that role.
  const [params, setParams] = useSearchParams();
  const addRole = ROLES[params.get('add')] ? params.get('add') : null;
  const [creating, setCreating] = useState(Boolean(addRole));
  const closeCreate = () => { setCreating(false); if (addRole) setParams({}, { replace: true }); };
  // Search as you type (after a short pause); Enter still applies it immediately.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  const qs = new URLSearchParams(Object.entries({ role, search: query }).filter(([, v]) => v)).toString();
  const { data, error, reload } = useApi(`/users${qs ? `?${qs}` : ''}`);

  const update = async (u, changes, msg) => {
    try {
      await api.patch(`/users/${u.id}`, changes);
      toast.success(msg);
      reload();
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <>
      <PageHeader title="Manage users" subtitle="Change roles, activate or deactivate accounts, and add mentors." actions={<Button icon={Plus} onClick={() => setCreating(true)}>Add user</Button>} />
      <Card className="mb-5" bodyClassName="flex flex-wrap gap-3 p-4">
        <form className="relative min-w-56 flex-1" onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); }}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
        <select className="input w-auto" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Card>
      <ErrorBox error={error} onRetry={reload} />
      <Card bodyClassName="p-0 overflow-x-auto">
        {!data ? <Loading /> : data.length === 0 ? <EmptyState title="No users found" /> : (
          <table className="table">
            <thead><tr><th>User</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} className="h-8 w-8 text-xs" />
                      <div><p className="font-medium"><PersonLink id={u.id} name={u.name} />{u.id === me.id && <Badge className="ml-2">You</Badge>}</p><p className="text-xs text-slate-500">{u.email}</p></div>
                    </div>
                  </td>
                  <td className="text-slate-600">{u.phone || '—'}</td>
                  <td>
                    <select className="input w-auto py-1" value={u.role} disabled={u.id === me.id}
                      onChange={(e) => window.confirm(`Change ${u.name}'s role to ${ROLES[e.target.value]}?`) && update(u, { role: e.target.value }, 'Role updated')}>
                      {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td>
                    <StatusBadge status={u.status} />
                    {!u.emailVerified && <p className="mt-1 text-xs text-amber-600">Email not verified</p>}
                  </td>
                  <td className="whitespace-nowrap text-slate-600">{fmtDate(u.createdAt)}</td>
                  <td className="text-right">
                    {u.id !== me.id && (u.status === 'active'
                      ? <Button size="sm" variant="ghost" icon={UserX} onClick={() => window.confirm(`Deactivate ${u.name}? They will no longer be able to log in.`) && update(u, { status: 'inactive' }, 'User deactivated')}>Deactivate</Button>
                      : <Button size="sm" variant="soft" icon={UserCheck} onClick={() => update(u, { status: 'active' }, 'User activated')}>Activate</Button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {creating && <CreateUser role={addRole || 'mentor'} onClose={closeCreate} onDone={() => { closeCreate(); reload(); }} />}
    </>
  );
}
