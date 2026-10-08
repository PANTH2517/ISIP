import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarPlus, Check, X, CalendarClock, CalendarDays, Ban, LogIn } from 'lucide-react';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { Button, Card, EmptyState, ErrorBox, Field, Loading, Modal, StatusBadge, Tabs } from './ui';
import RescheduleModal from './RescheduleModal';
import MeetingLocation from './MeetingLocation';
import { meetingTiming, useNow, useInterval } from '../utils/meetingTiming';
import { CheckInHint, ExpiryHint } from './MeetingHints';
import { fmtDate, fmtTime, todayISO } from '../utils/format';

function RequestModal({ startups, fixedStartupId, onClose, onDone }) {
  const [form, setForm] = useState({ startupId: fixedStartupId || (startups.length === 1 ? startups[0].id : ''), mentorId: '', requestedDate: '', requestedTime: '', location: '', agenda: '' });
  const [saving, setSaving] = useState(false);
  const startup = startups.find((s) => String(s.id) === String(form.startupId));
  const mentors = startup?.assignments || [];
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/meetings/requests', form);
      toast.success('Meeting request sent to your mentor');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title="Request a meeting">
      <form onSubmit={save} className="space-y-4">
        {!fixedStartupId && (
          <Field label="Startup" required>
            <select className="input" required value={form.startupId} onChange={(e) => setForm({ ...form, startupId: e.target.value, mentorId: '' })}>
              <option value="">Select…</option>
              {startups.map((s) => <option key={s.id} value={s.id}>{s.startupName}</option>)}
            </select>
          </Field>
        )}
        <Field label="Mentor" required hint={startup && !mentors.length ? 'No mentor is assigned to this startup yet.' : undefined}>
          <select className="input" required value={form.mentorId} onChange={set('mentorId')} disabled={!mentors.length}>
            <option value="">Select…</option>
            {mentors.map((a) => <option key={a.mentorId} value={a.mentorId}>{a.mentor.user.name}{a.mentor.availability ? ` (${a.mentor.availability})` : ''}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" required><input className="input" type="date" min={todayISO()} required value={form.requestedDate} onChange={set('requestedDate')} /></Field>
          <Field label="Time" required><input className="input" type="time" required value={form.requestedTime} onChange={set('requestedTime')} /></Field>
        </div>
        <Field label="Location or meeting link" hint="Optional: your mentor can change it when confirming"><input className="input" placeholder="https://meet.google.com/… or Incubation Cell, Room 2" value={form.location} onChange={set('location')} /></Field>
        <Field label="Agenda"><textarea className="input" rows={3} value={form.agenda} onChange={set('agenda')} placeholder="What would you like to discuss?" /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>Send request</Button></div>
      </form>
    </Modal>
  );
}

/** Mentor → schedule a meeting with one of their startups (confirmed immediately). */
function ScheduleModal({ fixedStartupId, onClose, onDone }) {
  const startups = useApi(fixedStartupId ? null : '/startups');
  const [form, setForm] = useState({ startupId: fixedStartupId || '', date: '', time: '', location: '', agenda: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const options = startups.data || [];
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/meetings', { ...form, startupId: form.startupId || options[0]?.id });
      toast.success('Meeting scheduled. The founder has been notified.');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title="Schedule a meeting">
      {!fixedStartupId && !startups.data ? <Loading /> : !fixedStartupId && options.length === 0 ? (
        <p className="text-sm text-slate-600">You don't have any assigned startups yet.</p>
      ) : (
        <form onSubmit={save} className="space-y-4">
          {!fixedStartupId && (
            <Field label="Startup" required>
              <select className="input" required value={form.startupId} onChange={set('startupId')}>
                <option value="">Select…</option>
                {options.map((s) => <option key={s.id} value={s.id}>{s.startupName}</option>)}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" required><input className="input" type="date" min={todayISO()} required value={form.date} onChange={set('date')} /></Field>
            <Field label="Time" required><input className="input" type="time" required value={form.time} onChange={set('time')} /></Field>
          </div>
          <Field label="Location or meeting link"><input className="input" placeholder="https://meet.google.com/… or Innovation Lab" value={form.location} onChange={set('location')} /></Field>
          <Field label="Agenda"><textarea className="input" rows={3} value={form.agenda} onChange={set('agenda')} placeholder="e.g. Review milestone progress and next steps" /></Field>
          <p className="text-xs text-slate-500">The meeting is confirmed straight away and the founder is notified.</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>Schedule</Button></div>
        </form>
      )}
    </Modal>
  );
}

/** Meeting requests + scheduled meetings (optionally filtered to one startup). */
export default function MeetingsPanel({ startupId, startups }) {
  const { user } = useAuth();
  const q = startupId ? `?startupId=${startupId}` : '';
  const requests = useApi(`/meetings/requests${q}`);
  const meetings = useApi(`/meetings${q}`);
  const detail = useApi(user.role === 'student' && startupId ? `/startups/${startupId}` : null);
  const [tab, setTab] = useState('upcoming');
  const [requesting, setRequesting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [slot, setSlot] = useState(null); // { kind: 'request'|'meeting', item }

  const now = useNow();
  const { reload: reloadRequests } = requests;
  const { reload: reloadMeetings } = meetings;
  const reload = useCallback(() => { reloadRequests(); reloadMeetings(); }, [reloadRequests, reloadMeetings]);
  // Pick up automatic expiries / missed meetings without a page refresh.
  useInterval(reload, 60000);
  const isMentor = user.role === 'mentor' || user.role === 'admin';
  const myStartups = startupId ? (detail.data ? [detail.data] : []) : (startups || []);

  const act = async (fn, msg) => {
    try { await fn(); toast.success(msg); reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  const respond = (r, action, extra = {}) => act(() => api.patch(`/meetings/requests/${r.id}`, { action, ...extra }), { accept: 'Meeting confirmed', reject: 'Request declined', reschedule: 'Meeting rescheduled' }[action]);
  const updateMeeting = (m, action, extra = {}) => act(() => api.patch(`/meetings/${m.id}`, { action, ...extra }), { checkin: "You're checked in", cancel: 'Meeting cancelled', complete: 'Marked as completed', reschedule: 'Meeting rescheduled' }[action]);

  const error = requests.error || meetings.error;
  if (error && !(requests.data && meetings.data)) return <ErrorBox error={error} onRetry={reload} />;
  if (!requests.data || !meetings.data) return <Loading />;

  const today = todayISO();
  const upcoming = meetings.data.filter((m) => m.status === 'scheduled' && m.date >= today);
  const history = meetings.data.filter((m) => !(m.status === 'scheduled' && m.date >= today)).reverse();
  const pendingReqs = requests.data.filter((r) => r.status === 'pending');

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', icon: CalendarDays, count: upcoming.length },
    { id: 'requests', label: 'Requests', icon: CalendarClock, count: pendingReqs.length },
    { id: 'history', label: 'History' },
  ];

  const who = (x) => (user.role === 'mentor' ? x.startup.startupName : `${x.mentor.user.name}${startupId ? '' : ` · ${x.startup.startupName}`}`);

  return (
    <Card
      title={user.role === 'student' ? 'Mentor meetings' : 'Meetings'}
      action={user.role === 'student'
        ? <Button size="sm" icon={CalendarPlus} onClick={() => setRequesting(true)}>Request meeting</Button>
        : user.role === 'mentor' && <Button size="sm" icon={CalendarPlus} onClick={() => setScheduling(true)}>Schedule meeting</Button>}
    >
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'upcoming' && (upcoming.length === 0 ? <EmptyState icon={CalendarDays} title="No upcoming meetings" /> : (
        <ul className="space-y-3">
          {upcoming.map((m) => {
            const t = meetingTiming(m.date, m.time, now);
            const participant = user.role !== 'admin';
            return (
            <li key={m.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 p-4">
              <div className="w-14 shrink-0 rounded-lg bg-indigo-50 py-1.5 text-center">
                <p className="text-[10px] font-semibold uppercase text-indigo-500">{new Date(`${m.date}T00:00`).toLocaleDateString('en-IN', { month: 'short' })}</p>
                <p className="text-xl font-bold leading-tight text-indigo-700">{new Date(`${m.date}T00:00`).getDate()}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.agenda || 'Mentoring session'}</p>
                <p className="text-sm text-slate-500">{fmtTime(m.time)} · {who(m)}{m.scheduledBy === 'mentor' && user.role === 'student' ? ' · scheduled by your mentor' : ''}</p>
                <CheckInHint checkedInAt={m.checkedInAt} timing={t} />
                <div><MeetingLocation location={m.location} /></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {participant && t.checkInOpen && !m.checkedInAt && <Button size="sm" icon={LogIn} onClick={() => updateMeeting(m, 'checkin')}>Check in</Button>}
                {isMentor && t.started && <Button size="sm" variant="success" icon={Check} onClick={() => updateMeeting(m, 'complete')}>Complete</Button>}
                {isMentor && !t.started && !m.checkedInAt && <Button size="sm" variant="secondary" icon={CalendarClock} onClick={() => setSlot({ kind: 'meeting', item: m })}>Reschedule</Button>}
                {!m.checkedInAt && <Button size="sm" variant="ghost" icon={Ban} onClick={() => window.confirm('Cancel this meeting?') && updateMeeting(m, 'cancel')}>Cancel</Button>}
              </div>
            </li>
            );
          })}
        </ul>
      ))}

      {tab === 'requests' && (requests.data.length === 0 ? <EmptyState icon={CalendarClock} title="No meeting requests" /> : (
        <ul className="space-y-3">
          {requests.data.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{who(r)}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm text-slate-500">Requested for {fmtDate(r.requestedDate)} at {fmtTime(r.requestedTime)}{r.meeting && r.status === 'rescheduled' ? ` → moved to ${fmtDate(r.meeting.date)} at ${fmtTime(r.meeting.time)}` : ''}</p>
                {r.status === 'pending' && <ExpiryHint timing={meetingTiming(r.requestedDate, r.requestedTime, now)} />}
                {r.agenda && <p className="mt-1 text-sm text-slate-700">{r.agenda}</p>}
                {r.mentorNote && <p className="mt-1 text-xs text-slate-500"><b>Mentor note:</b> {r.mentorNote}</p>}
              </div>
              {isMentor && r.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="success" icon={Check} onClick={() => respond(r, 'accept')}>Accept</Button>
                  <Button size="sm" variant="secondary" icon={CalendarClock} onClick={() => setSlot({ kind: 'request', item: r })}>Reschedule</Button>
                  <Button size="sm" variant="ghost" icon={X} onClick={() => { const note = window.prompt('Reason for declining (optional)'); if (note !== null) respond(r, 'reject', { note }); }}>Reject</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ))}

      {tab === 'history' && (history.length === 0 ? <EmptyState icon={CalendarDays} title="No past meetings" /> : (
        <table className="table">
          <thead><tr><th>Date</th><th>With</th><th>Agenda</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>
            {history.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap">{fmtDate(m.date)} · {fmtTime(m.time)}</td>
                <td>{who(m)}</td>
                <td>{m.agenda}</td>
                <td><StatusBadge status={m.status} /></td>
                <td className="text-slate-600">{m.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}

      {scheduling && <ScheduleModal fixedStartupId={startupId} onClose={() => setScheduling(false)} onDone={() => { setScheduling(false); reload(); }} />}
      {requesting && <RequestModal startups={myStartups.filter((s) => ['approved', 'incubated'].includes(s.status))} fixedStartupId={startupId} onClose={() => setRequesting(false)} onDone={() => { setRequesting(false); reload(); }} />}
      {slot && (
        <RescheduleModal
          current={slot.kind === 'request' ? { date: slot.item.requestedDate, time: slot.item.requestedTime } : { date: slot.item.date, time: slot.item.time }}
          hint="The founder is notified of the new time straight away."
          onClose={() => setSlot(null)}
          onSave={async ({ date, time, note }) => {
            // Errors propagate so the dialog stays open and shows the reason.
            if (slot.kind === 'request') await api.patch(`/meetings/requests/${slot.item.id}`, { action: 'reschedule', date, time, note: note || undefined });
            else await api.patch(`/meetings/${slot.item.id}`, { action: 'reschedule', date, time, notes: note || undefined });
            toast.success(`Meeting moved to ${fmtDate(date)} at ${fmtTime(time)}`);
            setSlot(null);
            reload();
          }}
        />
      )}
    </Card>
  );
}
