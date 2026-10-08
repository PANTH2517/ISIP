import { Link } from 'react-router-dom';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { Rocket, UserCheck, Sprout, IndianRupee, ClipboardList, GraduationCap, Landmark } from 'lucide-react';
import { Badge, Card, StatCard } from '../../components/ui';
import { fmtDate, timeAgo, plural, inrShort } from '../../utils/format';
import { PALETTE, STATUS_COLORS, monthLabel } from '../../utils/charts';
import WelcomeBanner from '../../components/portal/WelcomeBanner';

export function StatusDoughnut({ byStatus }) {
  const entries = Object.entries(byStatus);
  return (
    <Doughnut
      data={{ labels: entries.map(([k]) => k[0].toUpperCase() + k.slice(1)), datasets: [{ data: entries.map(([, v]) => v), backgroundColor: entries.map(([k]) => STATUS_COLORS[k]), borderWidth: 2 }] }}
      options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right' } } }}
    />
  );
}

export function IndustryBar({ industry }) {
  const entries = Object.entries(industry).sort((a, b) => b[1] - a[1]);
  return (
    <Bar
      data={{ labels: entries.map(([k]) => k), datasets: [{ label: 'Startups', data: entries.map(([, v]) => v), backgroundColor: PALETTE, borderRadius: 6, maxBarThickness: 40 }] }}
      options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }}
    />
  );
}

export function MonthlyLine({ monthly }) {
  return (
    <Line
      data={{
        labels: monthly.map((m) => monthLabel(m.month)),
        datasets: [
          { label: 'New users', data: monthly.map((m) => m.registrations), borderColor: '#1d4b94', backgroundColor: 'rgba(29,75,148,.1)', fill: true, tension: 0.35, cubicInterpolationMode: 'monotone' },
          { label: 'New startups', data: monthly.map((m) => m.startups), borderColor: '#f26b1d', backgroundColor: 'rgba(242,107,29,.08)', fill: true, tension: 0.35, cubicInterpolationMode: 'monotone' },
        ],
      }}
      options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }}
    />
  );
}

export default function AdminDashboard({ data }) {
  const { stats, pendingStartups, pendingFunding, recentActivity, awaitingFinance } = data;
  const { totals, funding, workshops, pendingApprovals, investments } = stats;

  return (
    <>
      <WelcomeBanner title="Incubation overview" subtitle="Everything happening in the Incubation & Innovation Cell at a glance." />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard icon={Rocket} label="Total startups" value={totals.startups} sub={`${plural(totals.drafts, 'draft')} in progress`} />
        <StatCard icon={Sprout} label="Active incubations" value={totals.activeIncubations} sub={`Avg. progress ${totals.averageProgress}%`} color="violet" />
        <StatCard icon={UserCheck} label="Mentors" value={totals.mentors} sub={`${totals.activeMentors} actively mentoring`} color="sky" />
        <StatCard icon={IndianRupee} label="Finance secured" value={inrShort(funding.approvedTotal + investments.committed)} sub={`${inrShort(funding.approvedTotal)} funding · ${inrShort(investments.committed)} investors`} color="green" />
        <StatCard icon={ClipboardList} label="Pending approvals" value={pendingApprovals.startups + pendingApprovals.funding} sub={`${plural(pendingApprovals.startups, 'startup')} · ${plural(pendingApprovals.funding, 'funding request')}`} color="amber" />
        <StatCard icon={GraduationCap} label="Workshops" value={workshops.total} sub={`${workshops.upcoming} upcoming · ${workshops.attended} attended`} color="rose" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Startups by status"><div className="h-60"><StatusDoughnut byStatus={stats.startupsByStatus} /></div></Card>
        <Card title="Industry-wise startups"><div className="h-60"><IndustryBar industry={stats.industry} /></div></Card>
        <Card title="Monthly registrations"><div className="h-60"><MonthlyLine monthly={stats.monthly} /></div></Card>
      </div>

      {awaitingFinance.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Landmark className="h-4 w-4" />
          <b>{plural(awaitingFinance.length, 'approved startup')} awaiting finance before incubation:</b>
          {awaitingFinance.map((s, i) => <span key={s.id}>{i > 0 && ', '}<Link to={`/startups/${s.id}`} className="underline">{s.startupName}</Link></span>)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Startups awaiting verification" action={<Link to="/startups?status=pending" className="text-sm font-medium text-indigo-600 hover:underline">All</Link>} bodyClassName="p-0">
          {pendingStartups.length === 0 ? <p className="p-5 text-sm text-slate-500">No pending startups.</p> : (
            <ul className="divide-y divide-slate-100">
              {pendingStartups.map((s) => (
                <li key={s.id}>
                  <Link to={`/startups/${s.id}`} className="block px-5 py-3 hover:bg-slate-50">
                    <p className="text-sm font-medium">{s.startupName} <span className="font-normal text-slate-500">· {s.industry}</span></p>
                    <p className="text-xs text-slate-500">by {s.founder.name} · submitted {fmtDate(s.submittedAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Funding requests to review" action={<Link to="/funding" className="text-sm font-medium text-indigo-600 hover:underline">All</Link>} bodyClassName="p-0">
          {pendingFunding.length === 0 ? <p className="p-5 text-sm text-slate-500">No pending funding requests.</p> : (
            <ul className="divide-y divide-slate-100">
              {pendingFunding.map((f) => (
                <li key={f.id}>
                  <Link to="/funding" className="flex items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50">
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{f.startup.startupName}</p><p className="line-clamp-2 text-xs text-slate-500">{f.purpose}</p></div>
                    <span className="shrink-0 text-sm font-semibold text-slate-800">{inrShort(f.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent activity" action={<Link to="/admin/audit" className="text-sm font-medium text-indigo-600 hover:underline">Audit log</Link>}>
          <ul className="space-y-3">
            {recentActivity.map((a) => (
              <li key={a.id} className="text-sm">
                <span className="font-medium">{a.user?.name || 'Guest'}</span> <span className="text-slate-600">{a.action}</span>
                <span className="ml-1 text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
                {a.statusCode >= 400 && <Badge color="red" className="ml-1">failed</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
