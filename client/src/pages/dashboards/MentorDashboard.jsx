import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bar } from 'react-chartjs-2';
import { Rocket, ClipboardCheck, CalendarClock, Trophy, Check, ChevronRight } from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { Badge, Button, Card, EmptyState, ProgressBar, StatCard, StatusBadge } from '../../components/ui';
import { fmtDate, fmtTime, timeAgo, firstName } from '../../utils/format';
import PersonLink from '../../components/PersonLink';
import WelcomeBanner from '../../components/portal/WelcomeBanner';

export default function MentorDashboard({ data, reload, user }) {
  const { assignments, pendingReviews, meetingRequests, upcomingMeetings, completedMilestones } = data;

  const accept = async (id) => {
    try {
      await api.patch(`/mentors/assignments/${id}/accept`);
      toast.success('Assignment accepted');
      reload();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const byDate = upcomingMeetings.reduce((acc, m) => ((acc[m.date] ||= []).push(m), acc), {});

  return (
    <>
      <WelcomeBanner title={`Hello, ${firstName(user.name)}`} subtitle="Your mentorship overview." />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Rocket} label="Assigned startups" value={assignments.length} sub={`${assignments.filter((a) => a.status === 'assigned').length} awaiting acceptance`} />
        <StatCard icon={ClipboardCheck} label="Pending reviews" value={pendingReviews.length} sub="Milestone updates" color="amber" />
        <StatCard icon={CalendarClock} label="Meeting requests" value={meetingRequests.length} sub={`${upcomingMeetings.length} upcoming meetings`} color="sky" />
        <StatCard icon={Trophy} label="Milestones completed" value={completedMilestones} sub="Across your startups" color="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Assigned startups" bodyClassName="p-0">
            {assignments.length === 0 ? <EmptyState icon={Rocket} title="No startups assigned yet" text="The incubation manager will assign startups to you." /> : (
              <ul className="divide-y divide-slate-100">
                {assignments.map((a) => (
                  <li key={a.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/startups/${a.startupId}`} className="font-semibold text-slate-800 hover:text-indigo-600">{a.startup.startupName}</Link>
                        <StatusBadge status={a.startup.status} />
                        {a.status === 'assigned' && <Badge color="yellow">New assignment</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{a.startup.industry} · Founder: <PersonLink id={a.startup.founder.id} name={a.startup.founder.name} /></p>
                      <ProgressBar value={a.startup.progress} className="mt-2 max-w-md" />
                    </div>
                    {a.status === 'assigned'
                      ? <Button size="sm" icon={Check} onClick={() => accept(a.id)}>Accept</Button>
                      : <Link to={`/startups/${a.startupId}`} aria-label="Open startup" className="rounded p-1 hover:bg-slate-100"><ChevronRight className="h-4 w-4 text-slate-400" /></Link>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Pending milestone reviews" bodyClassName="p-0">
            {pendingReviews.length === 0 ? <p className="p-5 text-sm text-slate-500">No updates awaiting your review.</p> : (
              <ul className="divide-y divide-slate-100">
                {pendingReviews.map((u) => (
                  <li key={u.id}>
                    <Link to={`/startups/${u.milestone.startup.id}?tab=milestones`} className="block px-5 py-3.5 hover:bg-slate-50">
                      <p className="text-sm font-medium">{u.milestone.startup.startupName} — {u.milestone.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{u.comments}</p>
                      <p className="mt-1 text-xs text-slate-400">Submitted by {u.submittedBy?.name} · {timeAgo(u.createdAt)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {assignments.length > 0 && (
            <Card title="Progress report" subtitle="Milestone completion per startup">
              <div className="h-56">
                <Bar
                  data={{ labels: assignments.map((a) => a.startup.startupName), datasets: [{ label: 'Progress %', data: assignments.map((a) => a.startup.progress), backgroundColor: '#1d4b94', borderRadius: 6, maxBarThickness: 48 }] }}
                  options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { max: 100, beginAtZero: true } } }}
                />
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Meeting requests" action={<Link to="/meetings" className="text-sm font-medium text-indigo-600 hover:underline">Manage</Link>}>
            {meetingRequests.length === 0 ? <p className="text-sm text-slate-500">No pending requests.</p> : (
              <ul className="space-y-3">
                {meetingRequests.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-medium">{r.startup.startupName}</p>
                    <p className="text-xs text-slate-500">{fmtDate(r.requestedDate)} · {fmtTime(r.requestedTime)}</p>
                    {r.agenda && <p className="mt-1 line-clamp-2 text-xs text-slate-600">{r.agenda}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Meeting calendar">
            {upcomingMeetings.length === 0 ? <p className="text-sm text-slate-500">No upcoming meetings.</p> : (
              <div className="space-y-4">
                {Object.entries(byDate).map(([date, ms]) => (
                  <div key={date}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{fmtDate(date)}</p>
                    {ms.map((m) => (
                      <div key={m.id} className="mb-1.5 flex gap-3 rounded-lg bg-indigo-50 px-3 py-2">
                        <span className="text-sm font-semibold text-indigo-700">{fmtTime(m.time)}</span>
                        <span className="truncate text-sm text-slate-700">{m.startup.startupName}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
