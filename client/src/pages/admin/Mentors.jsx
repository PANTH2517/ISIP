import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserPlus, UserCheck } from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Avatar, Badge, Button, Card, EmptyState, ErrorBox, Field, Loading, Modal, PageHeader, Stars } from '../../components/ui';
import { plural } from '../../utils/format';
import PersonLink from '../../components/PersonLink';

function AssignModal({ mentor, startups, onClose, onDone }) {
  const [startupId, setStartupId] = useState('');
  const [saving, setSaving] = useState(false);
  const taken = new Set(mentor.assignments.map((a) => a.startupId));
  const options = startups.filter((s) => !taken.has(s.id));
  const save = async () => {
    setSaving(true);
    try {
      await api.post('/mentors/assignments', { startupId, mentorId: mentor.id });
      toast.success(`${mentor.user.name} assigned`);
      onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Assign ${mentor.user.name} to a startup`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!startupId} loading={saving} onClick={save}>Assign</Button></>}>
      {options.length === 0 ? <p className="text-sm text-slate-500">No approved or incubated startups available for this mentor.</p> : (
        <Field label="Startup" hint="Only approved or incubated startups can receive mentors">
          <select className="input" value={startupId} onChange={(e) => setStartupId(e.target.value)}>
            <option value="">Select…</option>
            {options.map((s) => <option key={s.id} value={s.id}>{s.startupName} · {s.industry} ({plural(s.assignments.length, 'mentor')})</option>)}
          </select>
        </Field>
      )}
    </Modal>
  );
}

export default function Mentors() {
  const mentors = useApi('/mentors');
  const startups = useApi('/startups');
  const [assigning, setAssigning] = useState(null);
  const eligible = (startups.data || []).filter((s) => ['approved', 'incubated'].includes(s.status));
  const byId = Object.fromEntries((startups.data || []).map((s) => [s.id, s]));
  const unmentored = eligible.filter((s) => s.assignments.length === 0);

  if (mentors.error && !mentors.data) return <ErrorBox error={mentors.error} onRetry={mentors.reload} />;
  if (!mentors.data || !startups.data) return <Loading />;

  return (
    <>
      <PageHeader title="Mentor management" subtitle="Assign mentors to verified startups and balance their workload." actions={<Link to="/admin/users?add=mentor"><Button variant="secondary" icon={UserPlus}>Add mentor account</Button></Link>} />

      {unmentored.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <b>{plural(unmentored.length, 'approved startup')} {unmentored.length === 1 ? 'has' : 'have'} no mentor:</b>{' '}
          {unmentored.map((s, i) => <span key={s.id}>{i > 0 && ', '}<Link className="underline" to={`/startups/${s.id}`}>{s.startupName}</Link></span>)}
        </div>
      )}

      {mentors.data.length === 0 ? <Card><EmptyState icon={UserCheck} title="No mentors yet" text="Add mentor accounts from the Users page, or ask mentors to register." /></Card> : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {mentors.data.map((m) => (
            <div key={m.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar name={m.user.name} className="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold"><PersonLink id={m.user.id} name={m.user.name} /></p>
                  <p className="truncate text-xs text-slate-500">{m.user.email}</p>
                  {m.rating > 0 && <div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Stars value={m.rating} size="h-3 w-3" /> avg. rating given</div>}
                </div>
                <Badge color={m.activeAssignments ? 'indigo' : 'gray'}>{plural(m.activeAssignments, 'startup')}</Badge>
              </div>
              <p className="mt-3 text-sm font-medium text-indigo-700">{m.expertise || 'No expertise listed'}</p>
              {m.bio && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{m.bio}</p>}
              {m.availability && <p className="mt-2 text-xs text-slate-500">Availability: {m.availability}</p>}
              <div className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
                {m.assignments.map((a) => byId[a.startupId] && (
                  <Link key={a.id} to={`/startups/${a.startupId}`}><Badge color={a.status === 'accepted' ? 'green' : 'yellow'}>{byId[a.startupId].startupName}{a.status === 'assigned' ? ' (pending)' : ''}</Badge></Link>
                ))}
              </div>
              <Button className="mt-4" size="sm" variant="soft" icon={UserPlus} onClick={() => setAssigning(m)}>Assign to startup</Button>
            </div>
          ))}
        </div>
      )}
      {assigning && <AssignModal mentor={assigning} startups={eligible} onClose={() => setAssigning(null)} onDone={() => { setAssigning(null); mentors.reload(); startups.reload(); }} />}
    </>
  );
}
