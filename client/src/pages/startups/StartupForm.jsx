import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Save } from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { Button, Card, Field, Loading, PageHeader } from '../../components/ui';
import { INDUSTRIES } from '../../utils/format';

const EMPTY = { startupName: '', industry: '', description: '', problemStatement: '', solution: '', businessModel: '', technologyStack: '' };

export default function StartupForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [members, setMembers] = useState([{ name: '', email: '', role: '' }]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/startups/${id}`)
      .then(({ data }) => setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, data[k] || '']))))
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setMember = (i, k, v) => setMembers(members.map((m, j) => (j === i ? { ...m, [k]: v } : m)));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) {
        await api.put(`/startups/${id}`, form);
        toast.success('Startup updated');
        navigate(`/startups/${id}`);
      } else {
        const { data } = await api.post('/startups', { ...form, members: members.filter((m) => m.name.trim()) });
        toast.success('Startup saved as draft. Submit it for verification when ready.');
        navigate(`/startups/${data.id}`);
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title={id ? 'Edit startup' : 'Create a startup'} subtitle="Describe your idea clearly — the incubation manager uses this to verify your startup." />
      <form onSubmit={submit} className="space-y-6">
        <Card title="Basic information">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Startup name" required><input className="input" required maxLength={150} value={form.startupName} onChange={set('startupName')} /></Field>
            <Field label="Industry" required>
              <select className="input" required value={form.industry} onChange={set('industry')}>
                <option value="">Select industry…</option>
                {[...new Set([...INDUSTRIES, form.industry].filter(Boolean))].map((i) => <option key={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Short description" className="md:col-span-2"><textarea className="input" rows={2} value={form.description} onChange={set('description')} placeholder="One or two lines about what you do" /></Field>
            <Field label="Technology stack" className="md:col-span-2" hint="e.g. React, Node.js, PostgreSQL, IoT"><input className="input" value={form.technologyStack} onChange={set('technologyStack')} /></Field>
          </div>
        </Card>

        <Card title="Idea details" subtitle="Required before you can submit for verification">
          <div className="grid gap-4">
            <Field label="Problem statement"><textarea className="input" rows={3} value={form.problemStatement} onChange={set('problemStatement')} placeholder="What problem are you solving, and for whom?" /></Field>
            <Field label="Solution"><textarea className="input" rows={3} value={form.solution} onChange={set('solution')} placeholder="How does your product solve it?" /></Field>
            <Field label="Business model"><textarea className="input" rows={3} value={form.businessModel} onChange={set('businessModel')} placeholder="How will you make money?" /></Field>
          </div>
        </Card>

        {!id && (
          <Card title="Team members" subtitle="You can add or edit members later from the startup page" action={<Button type="button" size="sm" variant="soft" icon={Plus} onClick={() => setMembers([...members, { name: '', email: '', role: '' }])}>Add member</Button>}>
            <div className="space-y-3">
              {members.map((m, i) => (
                <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <input className="input" placeholder="Name" value={m.name} onChange={(e) => setMember(i, 'name', e.target.value)} />
                  <input className="input" type="email" placeholder="Email" value={m.email} onChange={(e) => setMember(i, 'email', e.target.value)} />
                  <input className="input" placeholder="Role (e.g. CTO)" value={m.role} onChange={(e) => setMember(i, 'role', e.target.value)} />
                  <Button type="button" variant="ghost" icon={Trash2} onClick={() => setMembers(members.filter((_, j) => j !== i))} aria-label="Remove member" />
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" icon={Save} loading={saving}>{id ? 'Save changes' : 'Save as draft'}</Button>
        </div>
      </form>
    </>
  );
}
