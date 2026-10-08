import { Link } from 'react-router-dom';
import { Briefcase, Handshake, Landmark, UserPlus } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Avatar, Badge, Button, Card, EmptyState, ErrorBox, Loading, PageHeader, StatCard, StatusBadge } from '../../components/ui';
import InvestorMeetings from '../../components/InvestorMeetings';
import { fmtDate, inr, inrShort, plural, ticketRange } from '../../utils/format';
import PersonLink from '../../components/PersonLink';

export default function Investors() {
  const investors = useApi('/investors');
  const offers = useApi('/investors/interests');

  if (investors.error && !investors.data) return <ErrorBox error={investors.error} onRetry={investors.reload} />;
  if (!investors.data || !offers.data) return <Loading />;
  const deals = offers.data.filter((o) => o.status === 'accepted');

  return (
    <>
      <PageHeader title="Investors" subtitle="Investor network, offers made to startups and closed deals." actions={<Link to="/admin/users"><Button variant="secondary" icon={UserPlus}>Add investor account</Button></Link>} />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Briefcase} label="Investors" value={investors.data.length} sub={`${investors.data.filter((i) => i.deals > 0).length} with closed deals`} />
        <StatCard icon={Handshake} label="Offers" value={offers.data.length} sub={`${offers.data.filter((o) => o.status === 'pending').length} awaiting founder reply`} color="amber" />
        <StatCard icon={Landmark} label="Committed" value={inrShort(deals.reduce((s, o) => s + Number(o.amount), 0))} sub={plural(deals.length, 'deal')} color="green" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {investors.data.length === 0 && <Card className="md:col-span-3"><EmptyState icon={Briefcase} title="No investors yet" text="Investors can register themselves or be added from the Users page." /></Card>}
        {investors.data.map((i) => (
          <div key={i.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Avatar name={i.user.name} className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold"><PersonLink id={i.user.id} name={i.user.name} /></p>
                <p className="text-xs text-slate-500">{i.firmName || 'Individual investor'}</p>
                <p className="break-all text-xs text-slate-400">{i.user.email}</p>
              </div>
              <Badge color="purple" className="shrink-0">{i.investorType}</Badge>
            </div>
            {i.focusIndustries && <p className="mt-3 text-sm font-medium text-indigo-700">{i.focusIndustries}</p>}
            {ticketRange(i.ticketMin, i.ticketMax) && <p className="mt-1 text-xs text-slate-500">Ticket size: {ticketRange(i.ticketMin, i.ticketMax)}</p>}
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
              <div><p className="text-lg font-bold">{i.offers}</p><p className="text-xs text-slate-500">Offers</p></div>
              <div><p className="text-lg font-bold">{i.deals}</p><p className="text-xs text-slate-500">Deals</p></div>
              <div><p className="text-lg font-bold">{inrShort(i.committed)}</p><p className="text-xs text-slate-500">Committed</p></div>
            </div>
          </div>
        ))}
      </div>

      <Card title="All investment offers" className="mb-6" bodyClassName="p-0 overflow-x-auto">
        {offers.data.length === 0 ? <EmptyState icon={Handshake} title="No offers yet" /> : (
          <table className="table">
            <thead><tr><th>Startup</th><th>Investor</th><th>Offer</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {offers.data.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/startups/${o.startupId}?tab=investors`} className="font-medium hover:text-indigo-600">{o.startup.startupName}</Link><p className="text-xs"><StatusBadge status={o.startup.status} /></p></td>
                  <td><PersonLink id={o.investor.user.id} name={o.investor.user.name} /><p className="text-xs text-slate-500">{o.investor.firmName}</p></td>
                  <td className="whitespace-nowrap"><p className="font-semibold">{inr(o.amount)}</p><p className="text-xs text-slate-500">{o.instrument}{o.equity ? ` · ${o.equity}%` : ''}</p></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="whitespace-nowrap text-slate-600">{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <InvestorMeetings title="All investor meetings" />
    </>
  );
}
