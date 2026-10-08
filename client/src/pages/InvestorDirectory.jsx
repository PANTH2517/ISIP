import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Mic, Search } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { Avatar, Badge, Button, Card, EmptyState, ErrorBox, Loading, PageHeader } from '../components/ui';
import { PitchRequestModal } from '../components/InvestorActions';
import { ticketRange } from '../utils/format';

/** Students browse investors and request pitch meetings. */
export default function InvestorDirectory() {
  const { data, error, reload } = useApi('/investors/directory');
  const startups = useApi('/startups');
  const [query, setQuery] = useState('');
  const [pitching, setPitching] = useState(null);

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data || !startups.data) return <Loading />;

  const myIndustries = new Set(startups.data.filter((s) => ['approved', 'incubated'].includes(s.status)).map((s) => s.industry.toLowerCase()));
  const canPitch = myIndustries.size > 0;
  const q = query.trim().toLowerCase();
  const list = data
    .filter((i) => !q || [i.name, i.firmName, i.investorType, ...i.focusIndustries].join(' ').toLowerCase().includes(q))
    .map((i) => ({ ...i, match: i.focusIndustries.some((f) => myIndustries.has(f.toLowerCase())) }))
    .sort((a, b) => Number(b.match) - Number(a.match));

  return (
    <>
      <PageHeader title="Investors" subtitle="Find investors who back startups like yours and request a pitch meeting." />
      {!canPitch && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You can browse investors now; pitching opens once one of your startups is <b>approved</b> by the incubation manager.
        </div>
      )}
      <Card className="mb-5" bodyClassName="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name, firm or industry…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </Card>
      {list.length === 0 ? <Card><EmptyState icon={Briefcase} title="No investors found" /></Card> : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => (
            <div key={i.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar name={i.name} className="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <Link to={`/people/${i.userId}`} className="font-semibold text-slate-800 hover:text-indigo-600 hover:underline">{i.name}</Link>
                  <p className="text-xs text-slate-500">{i.firmName || 'Individual investor'}</p>
                </div>
                <Badge color="purple" className="shrink-0">{i.investorType}</Badge>
              </div>
              {i.headline && <p className="mt-3 text-sm text-slate-600">{i.headline}</p>}
              {i.focusIndustries.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">{i.focusIndustries.map((f) => <Badge key={f} color={myIndustries.has(f.toLowerCase()) ? 'green' : 'gray'}>{f}</Badge>)}</div>
              )}
              <div className="mt-3 flex flex-1 flex-wrap items-end gap-x-4 gap-y-1 text-xs text-slate-500">
                {ticketRange(i.ticketMin, i.ticketMax) && <span>Ticket size: <b className="text-slate-700">{ticketRange(i.ticketMin, i.ticketMax)}</b></span>}
                <span>{i.deals} deal{i.deals === 1 ? '' : 's'} on StartIn</span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                {i.match ? <span className="text-xs font-medium text-emerald-700">Invests in your industry</span> : <span />}
                <Button size="sm" icon={Mic} disabled={!canPitch} onClick={() => setPitching(i)}>Request pitch</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {pitching && <PitchRequestModal investor={pitching} onClose={() => setPitching(null)} onDone={() => setPitching(null)} />}
    </>
  );
}
