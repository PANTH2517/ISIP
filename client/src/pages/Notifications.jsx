import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, Megaphone, Send, Rocket, Target, IndianRupee, CalendarDays, GraduationCap, UserCheck, MessageSquare, Info, Briefcase } from 'lucide-react';
import api, { errMsg } from '../api/client';
import { NOTIFICATIONS_CHANGED } from '../utils/events';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { Button, Card, EmptyState, ErrorBox, Field, Loading, PageHeader } from '../components/ui';
import { fmtDateTime, timeAgo } from '../utils/format';

const ICONS = { startup: Rocket, milestone: Target, funding: IndianRupee, meeting: CalendarDays, workshop: GraduationCap, mentor: UserCheck, feedback: MessageSquare, announcement: Megaphone, investment: Briefcase };

function Announce() {
  const [form, setForm] = useState({ message: '', audience: 'all' });
  const [sending, setSending] = useState(false);
  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await api.post('/notifications/announce', form);
      toast.success(data.message);
      setForm({ message: '', audience: form.audience });
    } catch (err) { toast.error(errMsg(err)); } finally { setSending(false); }
  };
  return (
    <Card title="Send announcement" subtitle="Delivered as a dashboard notification and email">
      <form onSubmit={send} className="space-y-4">
        <Field label="Audience">
          <select className="input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
            <option value="all">Everyone (students, mentors & investors)</option>
            <option value="student">Student entrepreneurs</option>
            <option value="mentor">Mentors</option>
            <option value="investor">Investors</option>
          </select>
        </Field>
        <Field label="Message" required><textarea className="input" rows={4} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
        <Button type="submit" icon={Send} loading={sending} className="w-full">Send announcement</Button>
      </form>
    </Card>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, error, reload } = useApi(`/notifications?limit=200${unreadOnly ? '&unread=true' : ''}`);

  const changed = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  const open = async (n) => {
    if (!n.isRead) await api.patch(`/notifications/${n.id}/read`).catch(() => {});
    changed();
    if (n.link) navigate(n.link); else reload();
  };
  const markAll = async () => {
    await api.patch('/notifications/read-all');
    changed();
    reload();
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle="Milestone approvals, meetings, funding decisions and announcements."
        actions={<>
          <Button variant="secondary" onClick={() => setUnreadOnly(!unreadOnly)}>{unreadOnly ? 'Show all' : 'Unread only'}</Button>
          <Button variant="secondary" icon={CheckCheck} onClick={markAll} disabled={!data?.unread}>Mark all read</Button>
        </>}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className={user.role === 'admin' ? 'lg:col-span-2' : 'lg:col-span-3'} bodyClassName="p-0">
          <ErrorBox error={error} onRetry={reload} />
          {!data ? <Loading /> : data.items.length === 0 ? <EmptyState icon={Bell} title="No notifications" text="You're all caught up." /> : (
            <ul className="divide-y divide-slate-100">
              {data.items.map((n) => {
                const Icon = ICONS[n.type] || Info;
                return (
                  <li key={n.id}>
                    <button onClick={() => open(n)} className={`flex w-full gap-3 px-5 py-4 text-left hover:bg-slate-50 ${n.isRead ? '' : 'bg-indigo-50/40'}`}>
                      <div className={`h-fit rounded-lg p-2 ${n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}><Icon className="h-4 w-4" /></div>
                      <div className="flex-1">
                        <p className={`text-sm ${n.isRead ? 'text-slate-600' : 'font-medium text-slate-800'}`}>{n.message}</p>
                        <p className="mt-0.5 text-xs text-slate-400" title={fmtDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        {user.role === 'admin' && <Announce />}
      </div>
    </>
  );
}
