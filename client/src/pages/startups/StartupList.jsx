import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Rocket, Search, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { Badge, Button, Card, EmptyState, ErrorBox, Loading, PageHeader, ProgressBar, StatusBadge, Stars } from '../../components/ui';
import { fmtDate, INDUSTRIES, inrShort } from '../../utils/format';
import PersonLink from '../../components/PersonLink';

const STATUSES = ['pending', 'approved', 'incubated', 'rejected', 'draft'];

function StartupCard({ s }) {
  const mentors = s.assignments?.map((a) => a.mentor.user.name).join(', ');
  return (
    <Link to={`/startups/${s.id}`} className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">{s.startupName[0]}</div>
        <StatusBadge status={s.status} />
      </div>
      <h3 className="mt-3 font-semibold text-slate-900 group-hover:text-indigo-700">{s.startupName}</h3>
      <p className="text-xs font-medium text-indigo-600">{s.industry}</p>
      <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-600">{s.description || 'No description yet.'}</p>
      {['approved', 'incubated'].includes(s.status) && <ProgressBar value={s.progress} className="mt-4" />}
      {s.finance && ['approved', 'incubated'].includes(s.status) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Finance secured <b className="text-slate-800">{inrShort(s.finance.total)}</b></span>
          {s.finance.investors > 0 && <Badge color="purple">{s.finance.investors} investor{s.finance.investors > 1 ? 's' : ''}</Badge>}
          {s.myInterest && <Badge color={{ pending: 'yellow', accepted: 'green', declined: 'red', withdrawn: 'gray' }[s.myInterest.status]}>Your offer: {s.myInterest.status}</Badge>}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="truncate">{mentors ? `Mentor: ${mentors}` : s.founder ? `Founder: ${s.founder.name}` : ''}</span>
        {s.rating > 0 && <Stars value={s.rating} size="h-3.5 w-3.5" />}
      </div>
    </Link>
  );
}

export default function StartupList() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const status = params.get('status') || '';
  const industry = params.get('industry') || '';
  const qs = new URLSearchParams(Object.entries({ status, industry, search: params.get('search') || '' }).filter(([, v]) => v)).toString();
  const { data, error, reload } = useApi(`/startups${qs ? `?${qs}` : ''}`);

  const setFilter = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next);
  };

  const titles = {
    student: ['My Startups', 'Create, edit and submit your startup ideas.'],
    mentor: ['Assigned Startups', 'Startups you are mentoring.'],
    admin: ['All Startups', 'Verify submissions, assign mentors and track incubation.'],
    investor: ['Browse Startups', 'Approved and incubated campus startups open to investment.'],
  };

  return (
    <>
      <PageHeader
        title={titles[user.role][0]}
        subtitle={titles[user.role][1]}
        actions={user.role === 'student' && <Link to="/startups/new"><Button icon={Plus}>New startup</Button></Link>}
      />

      {(user.role === 'admin' || user.role === 'investor') && (
        <Card className="mb-5" bodyClassName="flex flex-wrap items-center gap-3 p-4">
          <form className="relative min-w-56 flex-1" onSubmit={(e) => { e.preventDefault(); setFilter('search', search.trim()); }}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search by startup name…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
          <select className="input w-auto" value={status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {(user.role === 'investor' ? ['approved', 'incubated'] : STATUSES).map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className="input w-auto" value={industry} onChange={(e) => setFilter('industry', e.target.value)}>
            <option value="">All industries</option>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </Card>
      )}

      <ErrorBox error={error} onRetry={reload} />
      {!data ? <Loading /> : data.length === 0 ? (
        <Card>
          <EmptyState
            icon={Rocket}
            title={user.role === 'student' ? 'You have not created a startup yet' : 'No startups found'}
            text={user.role === 'student' ? 'Start by creating a startup profile. You can save it as a draft and submit it when ready.' : user.role === 'mentor' ? 'Once the incubation manager assigns you a startup it will appear here.' : user.role === 'investor' ? 'Startups appear here once the incubation cell approves them. Try changing the filters.' : 'Try changing the filters.'}
            action={user.role === 'student' && <Link to="/startups/new"><Button icon={Plus}>Create startup</Button></Link>}
          />
        </Card>
      ) : user.role === 'admin' ? (
        <Card bodyClassName="p-0 overflow-x-auto">
          <table className="table">
            <thead><tr><th>Startup</th><th>Founder</th><th>Status</th><th>Mentors</th><th>Progress</th><th>Finance</th><th>Submitted</th><th /></tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td><Link to={`/startups/${s.id}`} className="font-medium text-slate-800 hover:text-indigo-600">{s.startupName}</Link><p className="text-xs text-slate-500">{s.industry}</p></td>
                  <td><PersonLink id={s.founder?.id} name={s.founder?.name} /></td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="text-slate-600">{s.assignments.map((a) => a.mentor.user.name).join(', ') || <span className="text-slate-400">—</span>}</td>
                  <td className="min-w-36">{['approved', 'incubated'].includes(s.status) ? <ProgressBar value={s.progress} /> : <span className="text-slate-400">—</span>}</td>
                  <td className="whitespace-nowrap">{s.finance?.financed ? <span className="font-medium text-emerald-700">{inrShort(s.finance.total)}</span> : s.status === 'approved' ? <Badge color="yellow">Awaiting finance</Badge> : <span className="text-slate-400">—</span>}</td>
                  <td className="whitespace-nowrap text-slate-600">{fmtDate(s.submittedAt)}</td>
                  <td><Link to={`/startups/${s.id}`} aria-label={`Open ${s.startupName}`} className="inline-block rounded p-1 hover:bg-slate-100"><ChevronRight className="h-4 w-4 text-slate-400" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{data.map((s) => <StartupCard key={s.id} s={s} />)}</div>
      )}
    </>
  );
}
