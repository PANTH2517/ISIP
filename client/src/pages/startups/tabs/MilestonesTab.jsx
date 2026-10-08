import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Circle, Clock, Plus, Send, Check, X, CalendarDays, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import api, { errMsg } from '../../../api/client';
import { useApi } from '../../../hooks/useApi';
import { Button, Card, ErrorBox, Field, Loading, Modal, ProgressBar, StatusBadge } from '../../../components/ui';
import { fmtDate, timeAgo, plural } from '../../../utils/format';
import PersonLink from '../../../components/PersonLink';

function ReviewBox({ update, onDone }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);
  const review = async (decision) => {
    setBusy(decision);
    try {
      await api.post(`/milestones/updates/${update.id}/review`, { decision, mentorComments: note });
      toast.success(decision === 'approved' ? 'Milestone approved — progress updated' : 'Sent back for more work');
      onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };
  return (
    <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Awaiting your review</p>
      <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{update.comments}</p>
      <textarea className="input mt-2" rows={2} placeholder="Comments for the founder (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="success" icon={Check} loading={busy === 'approved'} onClick={() => review('approved')}>Approve milestone</Button>
        <Button size="sm" variant="secondary" icon={X} loading={busy === 'rejected'} onClick={() => review('rejected')}>Needs more work</Button>
      </div>
    </div>
  );
}

function MilestoneItem({ m, canReview, isOwner, onChange, isCurrent }) {
  const [open, setOpen] = useState(isCurrent);
  const [update, setUpdate] = useState('');
  const [sending, setSending] = useState(false);
  const pending = m.updates.find((u) => u.status === 'submitted');
  const Icon = m.status === 'completed' ? CheckCircle2 : m.status === 'pending' ? Circle : Clock;
  const iconColor = m.status === 'completed' ? 'text-emerald-500' : m.status === 'pending' ? 'text-slate-300' : 'text-indigo-500';

  const submitUpdate = async () => {
    setSending(true);
    try {
      await api.post(`/milestones/${m.id}/updates`, { comments: update });
      toast.success('Update submitted to your mentor');
      setUpdate('');
      onChange();
    } catch (e) { toast.error(errMsg(e)); } finally { setSending(false); }
  };
  const complete = async () => {
    try {
      await api.post(`/milestones/${m.id}/complete`, {});
      toast.success('Milestone marked complete');
      onChange();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete milestone "${m.name}"?`)) return;
    try { await api.delete(`/milestones/${m.id}`); onChange(); } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <li className="relative pl-10">
      <Icon className={`absolute left-0 top-0.5 h-6 w-6 bg-white ${iconColor}`} />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen(!open)}>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-800">{m.name}</span>
              <StatusBadge status={m.status} />
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{m.description}</p>
            <p className="mt-1 flex items-center gap-3 text-xs text-slate-400">
              {m.dueDate && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Due {fmtDate(m.dueDate)}</span>}
              {m.completedAt && <span>Completed {fmtDate(m.completedAt)}</span>}
              {m.updates.length > 0 && <span>{plural(m.updates.length, 'update')}</span>}
            </p>
          </div>
          {open ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
        </button>

        {open && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            {canReview && pending && <ReviewBox update={pending} onDone={onChange} />}
            {isOwner && ['pending', 'in_progress'].includes(m.status) && (
              <div className="mb-3">
                <Field label="Submit progress update" hint="Describe what you achieved. Your mentor will review and approve the milestone.">
                  <textarea className="input" rows={3} value={update} onChange={(e) => setUpdate(e.target.value)} />
                </Field>
                <Button size="sm" className="mt-2" icon={Send} disabled={!update.trim()} loading={sending} onClick={submitUpdate}>Submit for review</Button>
              </div>
            )}
            {isOwner && m.status === 'submitted' && <p className="mb-3 text-sm text-indigo-700">Your update is awaiting mentor review.</p>}
            {m.updates.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Update history</p>
                {m.updates.map((u) => (
                  <div key={u.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500"><PersonLink id={u.submittedBy?.id} name={u.submittedBy?.name} /> · {timeAgo(u.createdAt)}</span>
                      <StatusBadge status={u.status === 'submitted' ? 'submitted' : u.status} />
                    </div>
                    <p className="mt-1 whitespace-pre-line text-slate-700">{u.comments}</p>
                    {u.mentorComments && <p className="mt-2 border-l-2 border-indigo-300 pl-2 text-slate-600"><span className="font-medium">Mentor:</span> {u.mentorComments}</p>}
                  </div>
                ))}
              </div>
            )}
            {canReview && m.status !== 'completed' && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="soft" icon={CheckCircle2} onClick={complete}>Mark complete</Button>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={remove}>Delete</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export default function MilestonesTab({ startup, role, isOwner, onChange }) {
  const { data, error, reload } = useApi(`/milestones?startupId=${startup.id}`);
  const [adding, setAdding] = useState(null);
  const canReview = role === 'mentor' || role === 'admin';

  const refresh = () => { reload(); onChange(); };
  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/milestones', { ...adding, startupId: startup.id, dueDate: adding.dueDate || null });
      toast.success('Milestone added');
      setAdding(null);
      refresh();
    } catch (err) { toast.error(errMsg(err)); }
  };

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const current = data.milestones.find((m) => m.status !== 'completed');
  const done = data.milestones.filter((m) => m.status === 'completed').length;

  return (
    <Card
      title="Milestone tracking"
      subtitle={`${done} of ${data.milestones.length} milestones completed`}
      action={canReview && <Button size="sm" icon={Plus} onClick={() => setAdding({ name: '', description: '', dueDate: '' })}>Add milestone</Button>}
    >
      <ProgressBar value={data.progress} className="mb-6" />
      <ol className="relative space-y-4 before:absolute before:left-3 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-slate-200">
        {data.milestones.map((m) => <MilestoneItem key={m.id} m={m} canReview={canReview} isOwner={isOwner} onChange={refresh} isCurrent={m.id === current?.id} />)}
      </ol>
      <Modal open={!!adding} onClose={() => setAdding(null)} title="Add milestone">
        {adding && (
          <form onSubmit={add} className="space-y-4">
            <Field label="Name" required><input className="input" required value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} /></Field>
            <Field label="Description"><textarea className="input" rows={2} value={adding.description} onChange={(e) => setAdding({ ...adding, description: e.target.value })} /></Field>
            <Field label="Due date"><input className="input" type="date" value={adding.dueDate} onChange={(e) => setAdding({ ...adding, dueDate: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setAdding(null)}>Cancel</Button><Button type="submit">Add</Button></div>
          </form>
        )}
      </Modal>
    </Card>
  );
}
