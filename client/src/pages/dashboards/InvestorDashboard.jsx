import { Link } from 'react-router-dom';
import { Rocket, Handshake, Landmark, CalendarDays, ChevronRight, Sparkles, Bell } from 'lucide-react';
import { Badge, Card, EmptyState, ProgressBar, StatCard, StatusBadge, ClearanceBadge } from '../../components/ui';
import { fmtDate, fmtTime, inr, inrShort, timeAgo, firstName } from '../../utils/format';
import WelcomeBanner from '../../components/portal/WelcomeBanner';

export default function InvestorDashboard({ data, user }) {
  const { investor, recommended, offers, stats, meetings, availableStartups, notifications } = data;
  return (
    <>
      <WelcomeBanner
        title={`Hello, ${firstName(user.name)}`}
        subtitle={investor?.firmName ? `${investor.firmName} · ${investor.investorType}` : 'Discover and back promising campus startups.'}
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Rocket} label="Startups open to investment" value={availableStartups} sub="Approved & incubated" />
        <StatCard icon={Handshake} label="Offers made" value={stats.offers} sub={`${stats.pending} awaiting founder reply`} color="amber" />
        <StatCard icon={Landmark} label="Deals closed" value={stats.deals} sub={`${inrShort(stats.committed)} cleared${stats.awaitingClearance ? ` · ${stats.awaitingClearance} under review` : ''}`} color="green" />
        <StatCard icon={CalendarDays} label="Upcoming meetings" value={meetings.length} sub={meetings[0] ? `Next: ${fmtDate(meetings[0].date)}` : 'None scheduled'} color="sky" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Recommended for you" subtitle={investor?.focusIndustries ? `Matching your focus: ${investor.focusIndustries}` : 'Set focus industries in your profile for better matches'}
            action={<Link to="/startups" className="text-sm font-medium text-indigo-600 hover:underline">Browse all</Link>} bodyClassName="p-0">
            {recommended.length === 0 ? <EmptyState icon={Sparkles} title="You've reviewed every open startup" text="New startups appear here as soon as the incubation cell approves them." /> : (
              <ul className="divide-y divide-slate-100">
                {recommended.map((s) => (
                  <li key={s.id}>
                    <Link to={`/startups/${s.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">{s.startupName[0]}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-800">{s.startupName}</span>
                          <StatusBadge status={s.status} />
                          {s.matchesFocus && <Badge color="green">Matches your focus</Badge>}
                        </div>
                        <p className="line-clamp-2 text-sm text-slate-500">{s.industry} · {s.description}</p>
                        <div className="mt-2 flex items-center gap-4">
                          <ProgressBar value={s.progress} className="max-w-48 flex-1" />
                          <span className="text-xs text-slate-500">Raised {inrShort(s.finance?.total)}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="My offers" action={<Link to="/investor/deals" className="text-sm font-medium text-indigo-600 hover:underline">All offers</Link>} bodyClassName="p-0">
            {offers.length === 0 ? <p className="p-5 text-sm text-slate-500">You haven't made any offers yet. Open a startup and click “Make an offer”.</p> : (
              <ul className="divide-y divide-slate-100">
                {offers.map((o) => (
                  <li key={o.id}>
                    <Link to={`/startups/${o.startupId}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{o.startup.startupName} <span className="font-normal text-slate-500">· {o.startup.industry}</span></p>
                        <p className="text-xs text-slate-500">{inr(o.amount)} · {o.instrument}{o.equity ? ` · ${o.equity}%` : ''} · {fmtDate(o.createdAt)}</p>
                      </div>
                      <StatusBadge status={o.status} />
                      {o.status === 'accepted' && <ClearanceBadge clearance={o.clearance} />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Upcoming meetings" action={<Link to="/meetings" className="text-sm font-medium text-indigo-600 hover:underline">All</Link>}>
            {meetings.length === 0 ? <p className="text-sm text-slate-500">No meetings scheduled.</p> : (
              <ul className="space-y-3">
                {meetings.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <div className="w-12 shrink-0 rounded-lg bg-violet-50 py-1 text-center">
                      <p className="text-[10px] font-semibold uppercase text-violet-500">{new Date(`${m.date}T00:00`).toLocaleDateString('en-IN', { month: 'short' })}</p>
                      <p className="text-lg font-bold leading-tight text-violet-700">{new Date(`${m.date}T00:00`).getDate()}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.startup.startupName}</p>
                      <p className="text-xs text-slate-500">{fmtTime(m.time)}</p>
                    </div>
                    <StatusBadge status={m.status} />
                  </li>
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
