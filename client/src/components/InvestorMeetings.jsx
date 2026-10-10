import { useState } from 'react';
import toast from 'react-hot-toast';
import { Check, X, CalendarClock, Ban, CheckCheck, Briefcase, LogIn, FileText, Hourglass } from 'lucide-react';
import api, { downloadFile, errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { Badge, Button, Card, EmptyState, ErrorBox, Loading, StatusBadge } from './ui';
import MeetingLocation from './MeetingLocation';
import PersonLink from './PersonLink';
import RescheduleModal from './RescheduleModal';
import { fmtDate, fmtTime, inrShort } from '../utils/format';
import { meetingTiming, useNow, useInterval, MEETING_KINDS } from '../utils/meetingTiming';
import { CheckInHint, ExpiryHint } from './MeetingHints';

/**
 * Investor ↔ founder meetings (pitches, intro calls, diligence). Either side can propose a meeting or a new
 * time; the other side confirms. Both check in around the start time. Unconfirmed requests expire and
 * no-shows are marked missed automatically.
 */
export default function InvestorMeetings({ startupId, title = 'Investor meetings', action, refreshKey }) {
  const { user } = useAuth();
  const { data, error, reload } = useApi(`/investors/meetings${startupId ? `?startupId=${startupId}` : ''}${refreshKey ? `${startupId ? '&' : '?'}r=${refreshKey}` : ''}`);
  const [rescheduling, setRescheduling] = useState(null);
  const isFounder = user.role === 'student';
  const me = isFounder ? 'founder' : user.role === 'investor' ? 'investor' : null;
  const now = useNow();
  // Pick up automatic expiries / missed meetings without a page refresh.
  useInterval(reload, 60000);

  const act = async (m, action, extra = {}) => {
    try {
      await api.patch(`/investors/meetings/${m.id}`, { action, ...extra });
      toast.success({ checkin: "You're checked in", accept: 'Meeting confirmed', reject: 'Meeting declined', cancel: 'Meeting cancelled', complete: 'Marked as completed' }[action]);
      reload();
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  // Open meetings first (soonest first), then finished ones (most recent first).
  const isOpen = (m) => ['pending', 'accepted'].includes(m.status);
  const key = (m) => `${m.date}T${m.time}`;
  const sorted = [...data].sort((a, b) => (isOpen(a) !== isOpen(b) ? (isOpen(a) ? -1 : 1) : isOpen(a) ? key(a).localeCompare(key(b)) : key(b).localeCompare(key(a))));

  return (
    <Card title={title} action={action} bodyClassName="p-0">
      {sorted.length === 0 ? <EmptyState icon={Briefcase} title="No investor meetings yet" /> : (
        <ul className="divide-y divide-slate-100">
          {sorted.map((m) => {
            const open = isOpen(m);
            const t = meetingTiming(m.date, m.time, now);
            const investorName = `${m.investor.user.name}${m.investor.firmName ? ` · ${m.investor.firmName}` : ''}`;
            const awaiting = m.status === 'pending' ? (m.awaiting || 'founder') : null;
            const myTurn = awaiting && awaiting === me;
            const other = isFounder
              ? <PersonLink id={m.investor.user.id} name={investorName} />
              : user.role === 'admin' ? `${m.startup.startupName} ↔ ${investorName}` : m.startup.startupName;
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="w-14 shrink-0 rounded-lg bg-violet-50 py-1.5 text-center">
                  <p className="text-[10px] font-semibold uppercase text-violet-500">{new Date(`${m.date}T00:00`).toLocaleDateString('en-IN', { month: 'short' })}</p>
                  <p className="text-xl font-bold leading-tight text-violet-700">{new Date(`${m.date}T00:00`).getDate()}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{other}</p>
                    <Badge color={m.kind === 'pitch' ? 'indigo' : 'gray'}>{MEETING_KINDS[m.kind] || 'Meeting'}</Badge>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {fmtDate(m.date)} · {fmtTime(m.time)}
                    {m.askAmount && <> · Raising <b className="text-slate-700">{inrShort(m.askAmount)}</b></>}
                  </p>
                  {awaiting && !myTurn && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><Hourglass className="h-3.5 w-3.5" />Waiting for the {awaiting} to confirm</p>
                  )}
                  {myTurn && <p className="mt-1 text-xs font-medium text-indigo-700">Your confirmation is needed</p>}
                  {m.status === 'accepted' && <CheckInHint checkedInAt={m.checkedInAt} timing={t} />}
                  {m.status === 'pending' && <ExpiryHint timing={t} />}
                  {m.agenda && <p className="mt-0.5 text-sm text-slate-700">{m.agenda}</p>}
                  <div className="flex flex-wrap items-center gap-x-4">
                    {open && <MeetingLocation location={m.location} />}
                    {m.deck && (
                      <button onClick={() => downloadFile(`/documents/${m.deck.id}/download`).catch((e) => toast.error(errMsg(e)))} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline">
                        <FileText className="h-3.5 w-3.5" />{m.deck.fileName} (v{m.deck.version})
                      </button>
                    )}
                  </div>
                  {m.note && <p className="mt-0.5 text-xs text-slate-500"><b>Note:</b> {m.note}</p>}
                </div>
                {user.role !== 'admin' && (
                  <div className="flex flex-wrap gap-2">
                    {myTurn && <>
                      <Button size="sm" variant="success" icon={Check} onClick={() => act(m, 'accept')}>Accept</Button>
                      <Button size="sm" variant="ghost" icon={X} onClick={() => act(m, 'reject')}>Decline</Button>
                    </>}
                    {m.status === 'accepted' && t.checkInOpen && !m.checkedInAt && <Button size="sm" icon={LogIn} onClick={() => act(m, 'checkin')}>Check in</Button>}
                    {open && !t.started && !m.checkedInAt && <Button size="sm" variant="secondary" icon={CalendarClock} onClick={() => setRescheduling(m)}>Reschedule</Button>}
                    {m.status === 'accepted' && t.started && <Button size="sm" variant="soft" icon={CheckCheck} onClick={() => act(m, 'complete')}>Complete</Button>}
                    {/* When the request is waiting on you, Decline already covers it; Cancel is for confirmed meetings or your own requests. */}
                    {open && !m.checkedInAt && !myTurn && <Button size="sm" variant="ghost" icon={Ban} onClick={() => window.confirm('Cancel this meeting?') && act(m, 'cancel')}>Cancel</Button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {rescheduling && (
        <RescheduleModal
          current={{ date: rescheduling.date, time: rescheduling.time }}
          hint={isFounder ? 'The investor will be asked to confirm the new time.' : 'The founder will be asked to confirm the new time.'}
          onClose={() => setRescheduling(null)}
          onSave={async ({ date, time, note }) => {
            // Errors propagate so the dialog stays open and shows the reason.
            await api.patch(`/investors/meetings/${rescheduling.id}`, { action: 'reschedule', date, time, note: note || undefined });
            toast.success(`New time sent to the ${isFounder ? 'investor' : 'founder'} for confirmation`);
            setRescheduling(null);
            reload();
          }}
        />
      )}
    </Card>
  );
}
