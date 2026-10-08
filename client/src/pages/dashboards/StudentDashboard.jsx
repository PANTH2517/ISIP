import { Link } from 'react-router-dom';
import { Rocket, CalendarDays, IndianRupee, Target, Plus, ChevronRight, CheckCircle2, Circle, Clock, ListTodo, Bell, Briefcase } from 'lucide-react';
import { Button, Card, EmptyState, ProgressBar, StatCard, StatusBadge } from '../../components/ui';
import { fmtDate, fmtTime, timeAgo, firstName, inrShort } from '../../utils/format';
import WelcomeBanner from '../../components/portal/WelcomeBanner';

function MilestoneSteps({ milestones }) {
  return (
    <ol className="space-y-3">
      {milestones.map((m) => {
        const Icon = m.status === 'completed' ? CheckCircle2 : m.status === 'pending' ? Circle : Clock;
        const color = m.status === 'completed' ? 'text-emerald-500' : m.status === 'pending' ? 'text-slate-300' : 'text-indigo-500';
        return (
          <li key={m.id} className="flex items-center gap-3">
            <Icon className={`h-5 w-5 shrink-0 ${color}`} />
            <span className={`flex-1 text-sm ${m.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{m.name}</span>
            {m.status !== 'pending' && m.status !== 'completed' && <StatusBadge status={m.status} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function StudentDashboard({ data, user }) {
  const { startups, upcomingMeetings, tasks, funding, notifications, offers, investorMeetings } = data;
  const primary = startups.find((s) => ['incubated', 'approved'].includes(s.status)) || startups[0];
  const mentorNames = (s) => s.assignments.map((a) => a.mentor.user.name).join(', ');

  return (
    <>
      <WelcomeBanner
        title={`Hello, ${firstName(user.name)}`}
        subtitle="Here's how your startup journey is going."
        actions={<Link to="/startups/new"><Button variant="accent" icon={Plus}>New startup</Button></Link>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Rocket} label="My startups" value={startups.length} sub={primary ? `${primary.startupName}: ${primary.status}` : 'Create your first one'} />
        <StatCard icon={Target} label="Milestone progress" value={`${primary?.progress ?? 0}%`} sub={primary?.startupName || '—'} color="green" />
        <StatCard icon={CalendarDays} label="Upcoming meetings" value={upcomingMeetings.length} sub={upcomingMeetings[0] ? `Next: ${fmtDate(upcomingMeetings[0].date)}` : 'None scheduled'} color="sky" />
        <StatCard icon={IndianRupee} label="Finance secured" value={inrShort(funding.approved + offers.committed)} sub={`${inrShort(funding.approved)} funding · ${inrShort(offers.committed)} investors`} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="My startups" action={<Link to="/startups" className="text-sm font-medium text-indigo-600 hover:underline">View all</Link>} bodyClassName="p-0">
            {startups.length === 0 ? (
              <EmptyState icon={Rocket} title="No startups yet" text="Create a startup profile and submit it to the incubation cell for verification." action={<Link to="/startups/new"><Button icon={Plus}>Create startup</Button></Link>} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {startups.map((s) => (
                  <li key={s.id}>
                    <Link to={`/startups/${s.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-800">{s.startupName}</span>
                          <StatusBadge status={s.status} />
                          <span className="text-xs text-slate-500">{s.industry}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Mentor: {mentorNames(s) || 'Not assigned yet'}{s.status === 'approved' && !s.finance?.financed ? ' · Awaiting finance to enter incubation' : ''}</p>
                        {['approved', 'incubated'].includes(s.status) && <ProgressBar value={s.progress} className="mt-2 max-w-md" />}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card title="Upcoming meetings" action={<Link to="/meetings" className="text-sm font-medium text-indigo-600 hover:underline">All</Link>}>
              {upcomingMeetings.length === 0 ? <p className="text-sm text-slate-500">No meetings scheduled.</p> : (
                <ul className="space-y-3">
                  {upcomingMeetings.map((m) => (
                    <li key={m.id} className="flex gap-3">
                      <div className="w-12 shrink-0 rounded-lg bg-indigo-50 py-1 text-center">
                        <p className="text-[10px] font-semibold uppercase text-indigo-500">{new Date(`${m.date}T00:00`).toLocaleDateString('en-IN', { month: 'short' })}</p>
                        <p className="text-lg font-bold leading-tight text-indigo-700">{new Date(`${m.date}T00:00`).getDate()}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium">{m.agenda || 'Mentor meeting'}</p>
                        <p className="text-xs text-slate-500">{fmtTime(m.time)} · {m.mentor.user.name} · {m.startup.startupName}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Funding status" action={<Link to="/funding" className="text-sm font-medium text-indigo-600 hover:underline">All</Link>}>
              {funding.recent.length === 0 ? <p className="text-sm text-slate-500">No funding requests yet.</p> : (
                <ul className="space-y-3">
                  {funding.recent.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{inrShort(f.amount)} · {f.startup.startupName}</p>
                        <p className="line-clamp-2 text-xs text-slate-500">{f.purpose}</p>
                      </div>
                      <span className="shrink-0"><StatusBadge status={f.status} /></span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Pending tasks" action={<ListTodo className="h-4 w-4 text-slate-400" />}>
            {tasks.length === 0 ? <p className="text-sm text-slate-500">Nothing pending — great work! 🎉</p> : (
              <ul className="space-y-2">
                {tasks.map((t, i) => (
                  <li key={i}><Link to={t.link} className="flex items-start gap-2 rounded-lg p-2 text-sm hover:bg-slate-50"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{t.text}</Link></li>
                ))}
              </ul>
            )}
          </Card>
          {primary?.milestones?.length > 0 && (
            <Card title="Milestone progress" subtitle={primary.startupName}>
              <ProgressBar value={primary.progress} className="mb-4" />
              <MilestoneSteps milestones={primary.milestones} />
            </Card>
          )}
          <Card title="Investor interest" action={<Briefcase className="h-4 w-4 text-slate-400" />}>
            {offers.recent.length === 0 && investorMeetings.length === 0 ? <p className="text-sm text-slate-500">No investor offers yet. Approved startups are visible to investors on StartIn.</p> : (
              <ul className="space-y-3">
                {offers.recent.map((o) => (
                  <li key={o.id}>
                    <Link to={`/startups/${o.startupId}?tab=investors`} className="flex items-center justify-between gap-2 hover:opacity-80">
                      <div className="min-w-0"><p className="text-sm font-medium">{inrShort(o.amount)} · {o.investor.user.name}</p><p className="truncate text-xs text-slate-500">{o.startup.startupName}</p></div>
                      <span className="shrink-0"><StatusBadge status={o.status} /></span>
                    </Link>
                  </li>
                ))}
                {investorMeetings.map((m) => (
                  <li key={`m${m.id}`} className="text-xs text-slate-600">📅 Investor meeting with {m.investor.user.name} on {fmtDate(m.date)} at {fmtTime(m.time)} <StatusBadge status={m.status} /></li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Notifications" action={<Link to="/notifications" className="text-sm font-medium text-indigo-600 hover:underline">All</Link>}>
            {notifications.latest.length === 0 ? <p className="text-sm text-slate-500">No notifications.</p> : (
              <ul className="space-y-3">
                {notifications.latest.map((n) => (
                  <li key={n.id} className="flex gap-2">
                    <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.isRead ? 'text-slate-300' : 'text-indigo-500'}`} />
                    <div><p className="text-sm text-slate-700">{n.message}</p><p className="text-xs text-slate-400">{timeAgo(n.createdAt)}</p></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
