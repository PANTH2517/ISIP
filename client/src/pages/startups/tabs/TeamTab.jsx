import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import api, { errMsg } from '../../../api/client';
import { Avatar, Button, Card, EmptyState, Field, Modal } from '../../../components/ui';
import PersonLink from '../../../components/PersonLink';

export default function TeamTab({ startup, canEdit, reload }) {
  const [editing, setEditing] = useState(null); // {} for new, member for edit
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { name: editing.name, email: editing.email || null, role: editing.role };
      if (editing.id) await api.put(`/startups/${startup.id}/members/${editing.id}`, body);
      else await api.post(`/startups/${startup.id}/members`, body);
      toast.success(editing.id ? 'Member updated' : 'Member added');
      setEditing(null);
      reload();
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };

  const remove = async (m) => {
    if (!window.confirm(`Remove ${m.name} from the team?`)) return;
    try {
      await api.delete(`/startups/${startup.id}/members/${m.id}`);
      toast.success('Member removed');
      reload();
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <Card title="Team members" action={canEdit && <Button size="sm" icon={Plus} onClick={() => setEditing({ name: '', email: '', role: '' })}>Add member</Button>} bodyClassName="p-0">
      {startup.members.length === 0 ? <EmptyState icon={Users} title="No team members added" /> : (
        <ul className="divide-y divide-slate-100">
          {startup.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium"><PersonLink id={m.userId} name={m.name} /> {m.role && <span className="font-normal text-slate-500">· {m.role}</span>}</p>
                <p className="text-xs text-slate-500">{m.email || 'No email'}</p>
              </div>
              {canEdit && <>
                <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(m)} aria-label="Edit" />
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(m)} aria-label="Remove" />
              </>}
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit member' : 'Add team member'}>
        {editing && (
          <form onSubmit={save} className="space-y-4">
            <Field label="Name" required><input className="input" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Email"><input className="input" type="email" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Role"><input className="input" placeholder="e.g. CTO, Designer" value={editing.role || ''} onChange={(e) => setEditing({ ...editing, role: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={saving}>Save</Button></div>
          </form>
        )}
      </Modal>
    </Card>
  );
}
