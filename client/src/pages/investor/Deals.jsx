import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Handshake, Undo2, Landmark, Clock, XCircle } from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Button, Card, ClearanceBadge, EmptyState, ErrorBox, Loading, PageHeader, StatCard, StatusBadge } from '../../components/ui';
import { fmtDate, inr, plural, inrShort } from '../../utils/format';

const FILTERS = [['', 'All'], ['pending', 'Awaiting reply'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['withdrawn', 'Withdrawn']];

export default function Deals() {
  const { data, error, reload } = useApi('/investors/interests');
  const [filter, setFilter] = useState('');

  const withdraw = async (o) => {
    if (!window.confirm(`Withdraw your ${inr(o.amount)} offer to ${o.startup.startupName}?`)) return;
    try {
      await api.patch(`/investors/interests/${o.id}/withdraw`);
      toast.success('Offer withdrawn');
      reload();
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const cleared = data.filter((o) => o.status === 'accepted' && o.clearance === 'cleared');
  const inReview = data.filter((o) => o.status === 'accepted' && ['under_review', 'on_hold'].includes(o.clearance));
  const list = filter ? data.filter((o) => o.status === filter) : data;

  return (
    <>
      <PageHeader title="My offers" subtitle="Every offer you've made. Offers a founder accepts are cleared by the StartIn team before the deal is final." actions={<Link to="/startups"><Button icon={Handshake}>Find startups</Button></Link>} />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Landmark} label="Committed" value={inrShort(cleared.reduce((s, o) => s + Number(o.amount), 0))} sub={`${plural(cleared.length, 'deal')} cleared`} color="green" />
        <StatCard icon={Clock} label="In review" value={inReview.length} sub={inReview.length ? `${inrShort(inReview.reduce((s, o) => s + Number(o.amount), 0))} under review / on hold` : 'Nothing awaiting clearance'} color="sky" />
        <StatCard icon={Clock} label="Awaiting reply" value={data.filter((o) => o.status === 'pending').length} color="amber" />
        <StatCard icon={XCircle} label="Declined / withdrawn" value={data.filter((o) => ['declined', 'withdrawn'].includes(o.status)).length} color="rose" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`rounded-full px-3 py-1 text-sm font-medium ${filter === v ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{l}</button>
        ))}
      </div>
      <Card bodyClassName="p-0 overflow-x-auto">
        {list.length === 0 ? <EmptyState icon={Handshake} title="No offers here" text="Browse approved startups and make your first offer." /> : (
          <table className="table">
            <thead><tr><th>Startup</th><th>Offer</th><th>Status</th><th>Founder reply</th><th>Date</th><th /></tr></thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/startups/${o.startupId}`} className="font-medium hover:text-indigo-600">{o.startup.startupName}</Link><p className="text-xs text-slate-500">{o.startup.industry}</p></td>
                  <td className="whitespace-nowrap"><p className="font-semibold">{inr(o.amount)}</p><p className="text-xs text-slate-500">{o.instrument}{o.equity ? ` · ${o.equity}% equity` : ''}</p></td>
                  <td>
                    <div className="flex flex-wrap gap-1"><StatusBadge status={o.status} />{o.status === 'accepted' && <ClearanceBadge clearance={o.clearance} />}</div>
                    {o.clearanceNote && <p className="mt-1 max-w-[14rem] text-xs text-slate-500">{o.clearanceNote}</p>}
                  </td>
                  <td className="max-w-xs text-slate-600">{o.founderNote || '—'}</td>
                  <td className="whitespace-nowrap text-slate-600">{fmtDate(o.createdAt)}</td>
                  <td className="text-right">{o.status === 'pending' && <Button size="sm" variant="ghost" icon={Undo2} onClick={() => withdraw(o)}>Withdraw</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
