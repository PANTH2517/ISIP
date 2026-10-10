import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, CalendarDays, MapPin, Users, Award, Pencil, Ban, ClipboardCheck, GraduationCap, Clock } from 'lucide-react';
import api, { downloadFile, errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { Badge, Button, EmptyState, ErrorBox, Field, Loading, Modal, PageHeader, StatusBadge } from '../components/ui';
import { fmtDate, fmtTime, todayISO } from '../utils/format';
import PersonLink from '../components/PersonLink';

const TYPES = { workshop: ['Workshop', 'indigo'], hackathon: ['Hackathon', 'purple'], training: ['Training session', 'blue'] };

function WorkshopForm({ initial, onClose, onDone }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (form.id) await api.put(`/workshops/${form.id}`, form);
      else await api.post('/workshops', form);
      toast.success(form.id ? 'Event updated' : 'Event created and announced');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={form.id ? 'Edit event' : 'Create event'} size="lg">
      <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title" required className="sm:col-span-2"><input className="input" required value={form.title} onChange={set('title')} /></Field>
        <Field label="Type" required>
          <select className="input" value={form.type} onChange={set('type')}>{Object.entries(TYPES).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        <Field label="Venue"><input className="input" value={form.venue || ''} onChange={set('venue')} /></Field>
        <Field label="Date" required><input className="input" type="date" required value={form.date} onChange={set('date')} /></Field>
        <Field label="Time"><input className="input" type="time" value={form.time || ''} onChange={set('time')} /></Field>
        <Field label="Capacity" hint="Leave empty for unlimited"><input className="input" type="number" min="1" value={form.capacity ?? ''} onChange={set('capacity')} /></Field>
        {form.id && (
          <Field label="Status">
            <select className="input" value={form.status} onChange={set('status')}><option value="upcoming">Upcoming</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
          </Field>
        )}
        <Field label="Description" className="sm:col-span-2"><textarea className="input" rows={3} value={form.description || ''} onChange={set('description')} /></Field>
        <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>{form.id ? 'Save' : 'Create & announce'}</Button></div>
      </form>
    </Modal>
  );
}

function AttendanceModal({ workshop, onClose, onChange }) {
  const { data, reload } = useApi(`/workshops/${workshop.id}/registrations`);
  const notYet = workshop.date > todayISO();
  const mark = async (r, attendanceStatus) => {
    try {
      await api.patch(`/workshops/registrations/${r.id}/attendance`, { attendanceStatus });
      reload();
      onChange();
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Modal open onClose={onClose} title={`Attendance · ${workshop.title}`} size="lg">
      {notYet && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Attendance can be marked from the event date ({fmtDate(workshop.date)}).</p>
      )}
      {!data ? <Loading /> : data.length === 0 ? <EmptyState icon={Users} title="No registrations yet" /> : (
        <div className="-mx-5 overflow-x-auto px-5">
        <table className="table min-w-[28rem]">
          <thead><tr><th>Participant</th><th>Role</th><th>Status</th><th className="text-right">Mark</th></tr></thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td><p className="font-medium"><PersonLink id={r.user.id} name={r.user.name} /></p><p className="text-xs text-slate-500">{r.user.email}</p></td>
                <td className="capitalize">{r.user.role?.roleName}</td>
                <td><StatusBadge status={r.attendanceStatus} /></td>
                <td className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" disabled={notYet} variant={r.attendanceStatus === 'present' ? 'success' : 'secondary'} onClick={() => mark(r, 'present')}>Present</Button>
                    <Button size="sm" disabled={notYet} variant={r.attendanceStatus === 'absent' ? 'danger' : 'secondary'} onClick={() => mark(r, 'absent')}>Absent</Button>
                    {r.attendanceStatus === 'present' && <Button size="sm" variant="ghost" icon={Award} onClick={() => downloadFile(`/workshops/registrations/${r.id}/certificate`).catch((e) => toast.error(errMsg(e)))} aria-label="Certificate" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">Participants marked present can download their participation certificate.</p>
    </Modal>
  );
}

export default function Workshops() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const { data, error, reload } = useApi('/workshops');
  const [view, setView] = useState('upcoming');
  const [editing, setEditing] = useState(null);
  const [attendance, setAttendance] = useState(null);

  const act = async (fn, msg) => {
    try { await fn(); toast.success(msg); reload(); } catch (e) { toast.error(errMsg(e)); }
  };

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const today = todayISO();
  const isUpcoming = (w) => w.status === 'upcoming' && w.date >= today;
  const list = data.filter((w) => (view === 'upcoming' ? isUpcoming(w) : view === 'mine' ? w.myRegistration : !isUpcoming(w)));
  if (view === 'upcoming') list.reverse();

  const views = [['upcoming', 'Upcoming'], ...(isAdmin ? [] : [['mine', 'My registrations']]), ['past', 'Past & cancelled']];

  return (
    <>
      <PageHeader
        title="Workshops & events"
        subtitle={isAdmin ? 'Create workshops, hackathons and training sessions; track attendance and issue certificates.' : 'Register for workshops, hackathons and training sessions.'}
        actions={isAdmin && <Button icon={Plus} onClick={() => setEditing({ title: '', type: 'workshop', date: '', time: '', venue: '', capacity: '', description: '' })}>Create event</Button>}
      />
      <div className="mb-5 flex gap-2">
        {views.map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 text-sm font-medium ${view === v ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{l}</button>
        ))}
      </div>

      {list.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white"><EmptyState icon={GraduationCap} title="No events here" text={view === 'upcoming' ? 'New workshops and hackathons will be announced here.' : undefined} /></div> : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((w) => {
            const [typeLabel, typeColor] = TYPES[w.type] || [w.type, 'gray'];
            const full = w.capacity && w.registeredCount >= w.capacity;
            const reg = w.myRegistration;
            return (
              <div key={w.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <Badge color={typeColor}>{typeLabel}</Badge>
                  {w.status !== 'upcoming' ? <StatusBadge status={w.status} /> : !isUpcoming(w) && <Badge>Past</Badge>}
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{w.title}</h3>
                <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-600">{w.description}</p>
                <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" />{fmtDate(w.date)}{w.time && <><Clock className="ml-2 h-4 w-4 text-slate-400" />{fmtTime(w.time)}</>}</p>
                  {w.venue && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" />{w.venue}</p>}
                  <p className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" />{w.registeredCount}{w.capacity ? ` / ${w.capacity}` : ''} registered{w.attendedCount ? ` · ${w.attendedCount} attended` : ''}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {isAdmin ? <>
                    {w.status !== 'cancelled' && <Button size="sm" variant="secondary" icon={ClipboardCheck} onClick={() => setAttendance(w)}>Attendance</Button>}
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(w)}>Edit</Button>
                    {w.status === 'upcoming' && <Button size="sm" variant="ghost" icon={Ban} onClick={() => window.confirm(`Cancel "${w.title}"? Registered users will be notified.`) && act(() => api.patch(`/workshops/${w.id}/cancel`), 'Event cancelled')}>Cancel</Button>}
                  </> : <>
                    {reg && <StatusBadge status={reg.attendanceStatus} />}
                    {!reg && isUpcoming(w) && <Button size="sm" disabled={!!full} onClick={() => act(() => api.post(`/workshops/${w.id}/register`), 'Registered!')}>{full ? 'Event full' : 'Register'}</Button>}
                    {reg?.attendanceStatus === 'registered' && isUpcoming(w) && <Button size="sm" variant="ghost" onClick={() => act(() => api.delete(`/workshops/${w.id}/register`), 'Registration cancelled')}>Unregister</Button>}
                    {reg?.attendanceStatus === 'present' && <Button size="sm" variant="soft" icon={Award} onClick={() => downloadFile(`/workshops/registrations/${reg.id}/certificate`).catch((e) => toast.error(errMsg(e)))}>Download certificate</Button>}
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <WorkshopForm initial={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
      {attendance && <AttendanceModal workshop={attendance} onClose={() => setAttendance(null)} onChange={reload} />}
    </>
  );
}
