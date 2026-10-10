import { useState } from 'react';
import toast from 'react-hot-toast';
import { Check, X, Handshake, Landmark } from 'lucide-react';
import api, { errMsg } from '../../../api/client';
import { useApi } from '../../../hooks/useApi';
import { Avatar, Badge, Button, Card, ClearanceBadge, EmptyState, ErrorBox, Field, Loading, Modal, StatusBadge } from '../../../components/ui';
import InvestorMeetings from '../../../components/InvestorMeetings';
import { fmtDate, inr, plural } from '../../../utils/format';
import PersonLink from '../../../components/PersonLink';

function RespondModal({ offer, decision, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/investors/interests/${offer.id}/respond`, { decision, note });
      toast.success(decision === 'accepted' ? 'Offer accepted. The StartIn team will review the transaction.' : 'Offer declined');
      onDone(data);
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  const accept = decision === 'accepted';
  return (
    <Modal open onClose={onClose} title={accept ? 'Accept investment offer' : 'Decline offer'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={accept ? 'success' : 'danger'} loading={saving} onClick={save}>{accept ? 'Accept offer' : 'Decline'}</Button></>}>
      <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
        <p className="font-semibold">{inr(offer.amount)} · {offer.instrument}{offer.equity ? ` · ${offer.equity}% equity` : ''}</p>
        <p className="text-slate-600">from {offer.investor.user.name}{offer.investor.firmName ? ` (${offer.investor.firmName})` : ''}</p>
      </div>
      {accept && <p className="mb-3 text-sm text-emerald-700">The StartIn team will review this transaction. Once it is cleared it counts as finance, and an approved startup moves into incubation.</p>}
      <Field label="Note to the investor (optional)"><textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </Modal>
  );
}

/** Founder/admin view of investor offers and investor meetings for one startup. */
export default function InvestorsTab({ startup, canRespond, onChange }) {
  const { data, error, reload } = useApi(`/investors/interests?startupId=${startup.id}`);
  const [responding, setResponding] = useState(null);
  const f = startup.finance || {};

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <div className="space-y-6">
      <div className={`flex flex-wrap items-center gap-4 rounded-xl border p-4 ${f.financed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
        <Landmark className={`h-6 w-6 ${f.financed ? 'text-emerald-600' : 'text-amber-600'}`} />
        <div className="flex-1 text-sm">
          <p className={`font-semibold ${f.financed ? 'text-emerald-800' : 'text-amber-800'}`}>{f.financed ? `Finance secured: ${inr(f.total)}` : 'No finance secured yet'}</p>
          <p className={f.financed ? 'text-emerald-700' : 'text-amber-700'}>
            {f.financed
              ? `Cleared deals from ${plural(f.investors, 'investor')}.`
              : 'A startup enters incubation once an investor deal is accepted by the founder and cleared by the StartIn team.'}
            {f.awaitingDeals > 0 && ` ${inr(f.awaitingClearance)} in ${plural(f.awaitingDeals, 'deal')} awaiting clearance.`}
          </p>
        </div>
      </div>

      <Card title="Investment offers" subtitle={`${plural(data.length, 'offer')} received`} bodyClassName="p-0">
        {data.length === 0 ? <EmptyState icon={Handshake} title="No offers yet" text="Approved startups are visible to investors on the platform. Offers will appear here." /> : (
          <ul className="divide-y divide-slate-100">
            {data.map((o) => (
              <li key={o.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                <Avatar name={o.investor.user.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium"><PersonLink id={o.investor.user.id} name={o.investor.user.name} /></p>
                    {o.investor.firmName && <span className="text-sm text-slate-500">· {o.investor.firmName}</span>}
                    <Badge color="purple">{o.investor.investorType}</Badge>
                    <StatusBadge status={o.status} />
                    {o.status === 'accepted' && <ClearanceBadge clearance={o.clearance} />}
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-900">{inr(o.amount)} <span className="text-sm font-normal text-slate-500">· {o.instrument}{o.equity ? ` · ${o.equity}% equity` : ''}</span></p>
                  {o.message && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">“{o.message}”</p>}
                  {o.founderNote && <p className="mt-1 text-xs text-slate-500"><b>Your reply:</b> {o.founderNote}</p>}
                  {o.clearanceNote && <p className="mt-1 text-xs text-slate-500"><b>StartIn team:</b> {o.clearanceNote}</p>}
                  <p className="mt-1 text-xs text-slate-400">Offered {fmtDate(o.createdAt)}{o.respondedAt ? ` · responded ${fmtDate(o.respondedAt)}` : ''}</p>
                </div>
                {canRespond && o.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="success" icon={Check} onClick={() => setResponding({ offer: o, decision: 'accepted' })}>Accept</Button>
                    <Button size="sm" variant="ghost" icon={X} onClick={() => setResponding({ offer: o, decision: 'declined' })}>Decline</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <InvestorMeetings startupId={startup.id} />

      {responding && (
        <RespondModal {...responding} onClose={() => setResponding(null)} onDone={() => { setResponding(null); reload(); onChange(); }} />
      )}
    </div>
  );
}
