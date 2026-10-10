import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, PauseCircle, XCircle, Landmark } from 'lucide-react';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { Button, Card, ClearanceBadge, EmptyState, ErrorBox, Field, Loading, Modal } from './ui';
import PersonLink from './PersonLink';
import { fmtDate, inr, plural } from '../utils/format';

const ACTIONS = {
  clear: { title: 'Clear transaction', button: 'Clear', variant: 'success', icon: CheckCircle2, help: 'The deal counts as secured finance. An approved startup moves into incubation.' },
  hold: { title: 'Put transaction on hold', button: 'Put on hold', variant: 'secondary', icon: PauseCircle, help: 'The deal is paused until you clear or cancel it. Tell both sides what is missing.' },
  cancel: { title: 'Cancel transaction', button: 'Cancel transaction', variant: 'danger', icon: XCircle, help: 'The deal will not go ahead. This cannot be undone.' },
};

function ClearanceModal({ deal, action, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const a = ACTIONS[action];
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/investors/interests/${deal.id}/clearance`, { action, note });
      toast.success(data.incubated ? `🚀 Cleared: ${deal.startup.startupName} is now incubated` : { clear: 'Transaction cleared', hold: 'Transaction put on hold', cancel: 'Transaction cancelled' }[action]);
      onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={a.title}
      footer={<><Button variant="secondary" onClick={onClose}>Back</Button><Button variant={a.variant === 'secondary' ? 'accent' : a.variant} loading={saving} onClick={save}>{a.button}</Button></>}>
      <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
        <p className="font-semibold">{inr(deal.amount)} · {deal.instrument}{deal.equity ? ` · ${deal.equity}% equity` : ''}</p>
        <p className="text-slate-600">{deal.investor.user.name}{deal.investor.firmName ? ` (${deal.investor.firmName})` : ''} → {deal.startup.startupName}</p>
      </div>
      <p className="mb-3 text-sm text-slate-600">{a.help}</p>
      <Field label={action === 'clear' ? 'Note (optional)' : 'Reason'} required={action !== 'clear'}>
        <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={action === 'hold' ? 'e.g. Waiting for the signed term sheet' : ''} />
      </Field>
    </Modal>
  );
}

/**
 * Funding transactions: investor offers a founder has accepted. The StartIn team clears, holds or
 * cancels each one; founders and investors see the status. `clearance` filters (comma-separated).
 */
export default function TransactionsPanel({ startupId, clearance = '' }) {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const qs = new URLSearchParams(Object.entries({ status: 'accepted', startupId: startupId || '', clearance }).filter(([, v]) => v)).toString();
  const { data, error, reload } = useApi(`/investors/interests?${qs}`);
  const [acting, setActing] = useState(null);

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const cleared = data.filter((d) => d.clearance === 'cleared').reduce((s, d) => s + Number(d.amount), 0);

  return (
    <Card title="Funding transactions" subtitle={`${plural(data.length, 'transaction')} · ${inr(cleared)} cleared`} bodyClassName="p-0 overflow-x-auto">
      {data.length === 0 ? (
        <EmptyState icon={Landmark} title="No transactions here"
          text={isAdmin ? 'When a founder accepts an investor offer, it appears here for review.' : <>Accepted investor offers appear here. <Link to="/investors" className="font-medium text-indigo-700 underline">Pitch to investors</Link> to get one.</>} />
      ) : (
        <table className="table">
          <thead><tr>{!startupId && <th>Startup</th>}<th>Investor</th><th>Amount</th><th>Accepted</th><th>Status</th>{isAdmin && <th />}</tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id}>
                {!startupId && <td><Link to={`/startups/${d.startupId}`} className="font-medium hover:text-indigo-700">{d.startup.startupName}</Link></td>}
                <td>
                  <PersonLink id={d.investor.user.id} name={d.investor.user.name} className="font-medium" />
                  {d.investor.firmName && <p className="text-xs text-slate-500">{d.investor.firmName}</p>}
                </td>
                <td className="whitespace-nowrap"><p className="font-semibold">{inr(d.amount)}</p><p className="text-xs text-slate-500">{d.instrument}{d.equity ? ` · ${d.equity}% equity` : ''}</p></td>
                <td className="whitespace-nowrap text-slate-600">{fmtDate(d.respondedAt)}</td>
                <td className="max-w-xs">
                  <ClearanceBadge clearance={d.clearance} />
                  {d.clearanceNote && <p className="mt-1 text-xs text-slate-500">{d.clearanceNote}</p>}
                  {d.reviewedAt && <p className="text-xs text-slate-400">{fmtDate(d.reviewedAt)}</p>}
                </td>
                {isAdmin && (
                  <td className="text-right">
                    {['under_review', 'on_hold'].includes(d.clearance) && (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => setActing({ deal: d, action: 'clear' })}>Clear</Button>
                        {d.clearance === 'under_review' && <Button size="sm" variant="secondary" icon={PauseCircle} onClick={() => setActing({ deal: d, action: 'hold' })}>Hold</Button>}
                        <Button size="sm" variant="ghost" icon={XCircle} onClick={() => setActing({ deal: d, action: 'cancel' })}>Cancel</Button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {acting && <ClearanceModal {...acting} onClose={() => setActing(null)} onDone={() => { setActing(null); reload(); }} />}
    </Card>
  );
}
