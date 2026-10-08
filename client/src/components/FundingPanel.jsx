import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Gavel, IndianRupee, FileText } from 'lucide-react';
import api, { downloadFile, errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { Button, Card, EmptyState, ErrorBox, Field, Loading, Modal, StatusBadge } from './ui';
import { fmtDate, inr, plural } from '../utils/format';

function RequestForm({ initial, startups, onClose, onDone }) {
  const [form, setForm] = useState(initial);
  const [docs, setDocs] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form.startupId) return;
    api.get(`/documents?startupId=${form.startupId}`).then((r) => setDocs(r.data)).catch(() => setDocs([]));
  }, [form.startupId]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = { ...form, businessPlanId: form.businessPlanId || null, supportingDocumentId: form.supportingDocumentId || null };
    try {
      if (form.id) await api.put(`/funding/${form.id}`, body);
      else await api.post('/funding', body);
      toast.success(form.id ? 'Request updated and resubmitted' : 'Funding request submitted');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };

  const docOptions = docs.map((d) => <option key={d.id} value={d.id}>{d.fileName} (v{d.version})</option>);
  return (
    <Modal open onClose={onClose} title={form.id ? 'Modify funding request' : 'Request funding'}>
      <form onSubmit={save} className="space-y-4">
        {form.adminRemarks && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"><b>Requested changes:</b> {form.adminRemarks}</div>}
        {!form.id && startups.length > 1 && (
          <Field label="Startup" required>
            <select className="input" required value={form.startupId} onChange={set('startupId')}>
              <option value="">Select…</option>
              {startups.map((s) => <option key={s.id} value={s.id}>{s.startupName}</option>)}
            </select>
          </Field>
        )}
        <Field label="Purpose" required><textarea className="input" rows={3} required value={form.purpose} onChange={set('purpose')} placeholder="What will the money be used for?" /></Field>
        <Field label="Amount (₹)" required><input className="input" type="number" min="1" step="1" required value={form.amount} onChange={set('amount')} /></Field>
        <Field label="Business plan" hint="Upload documents in the startup's Documents tab first">
          <select className="input" value={form.businessPlanId || ''} onChange={set('businessPlanId')}><option value="">None</option>{docOptions}</select>
        </Field>
        <Field label="Supporting document">
          <select className="input" value={form.supportingDocumentId || ''} onChange={set('supportingDocumentId')}><option value="">None</option>{docOptions}</select>
        </Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>{form.id ? 'Resubmit' : 'Submit request'}</Button></div>
      </form>
    </Modal>
  );
}

function DecisionModal({ request, onClose, onDone }) {
  const [status, setStatus] = useState('approved');
  const [approvedAmount, setApprovedAmount] = useState(Number(request.amount));
  const [adminRemarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/funding/${request.id}/decision`, { status, approvedAmount, adminRemarks });
      toast.success(data.incubated ? `🚀 Funding approved — ${request.startup.startupName} is now incubated` : 'Decision recorded and founder notified');
      onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  const options = [['approved', 'Approve'], ['modification_requested', 'Request modification'], ['rejected', 'Reject']];
  return (
    <Modal open onClose={onClose} title={`Review funding · ${request.startup.startupName}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={status === 'rejected' ? 'danger' : status === 'approved' ? 'success' : 'primary'} loading={saving} onClick={save}>Confirm</Button></>}>
      <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
        <p className="font-semibold">{inr(request.amount)} requested</p>
        <p className="mt-1 text-slate-600">{request.purpose}</p>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {options.map(([v, l]) => (
          <button key={v} type="button" onClick={() => setStatus(v)} className={`rounded-lg border-2 px-2 py-2 text-sm font-medium ${status === v ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>{l}</button>
        ))}
      </div>
      {status === 'approved' && <Field label="Approved amount (₹)" className="mb-4"><input className="input" type="number" min="1" max={request.amount} value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} /></Field>}
      <Field label="Remarks" required={status !== 'approved'}><textarea className="input" rows={3} value={adminRemarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
    </Modal>
  );
}

/** Funding requests list + create/modify (student) + decisions (admin). */
export default function FundingPanel({ startupId, startups = [], canCreate, statusFilter = '', onChange }) {
  const { user } = useAuth();
  const qs = new URLSearchParams(Object.entries({ startupId: startupId || '', status: statusFilter }).filter(([, v]) => v)).toString();
  const { data, error, reload } = useApi(`/funding${qs ? `?${qs}` : ''}`);
  const [editing, setEditing] = useState(null);
  const [deciding, setDeciding] = useState(null);
  const eligible = startups.filter((s) => ['approved', 'incubated'].includes(s.status));

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const requested = data.reduce((s, f) => s + Number(f.amount), 0);
  const approved = data.filter((f) => f.status === 'approved').reduce((s, f) => s + Number(f.approvedAmount || 0), 0);
  const docLink = (d) => d && (
    <button onClick={() => downloadFile(`/documents/${d.id}/download`).catch((e) => toast.error(errMsg(e)))} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
      <FileText className="h-3 w-3" />{d.fileName} v{d.version}
    </button>
  );

  return (
    <Card
      title="Funding history"
      subtitle={`${plural(data.length, 'request')} · ${inr(requested)} requested · ${inr(approved)} approved`}
      action={canCreate && eligible.length > 0 && <Button size="sm" icon={Plus} onClick={() => setEditing({ startupId: startupId || (eligible.length === 1 ? eligible[0].id : ''), purpose: '', amount: '' })}>Request funding</Button>}
      bodyClassName="p-0 overflow-x-auto"
    >
      {data.length === 0 ? (
        <EmptyState icon={IndianRupee} title="No funding requests" text={canCreate ? (eligible.length ? 'Apply for seed funding with a clear purpose and your business plan.' : 'Funding can be requested once your startup is approved.') : 'Nothing to show.'} />
      ) : (
        <table className="table">
          <thead><tr>{!startupId && <th>Startup</th>}<th>Purpose</th><th>Amount</th><th>Status</th><th>Documents</th><th>Requested</th><th /></tr></thead>
          <tbody>
            {data.map((f) => (
              <tr key={f.id}>
                {!startupId && <td className="font-medium">{f.startup.startupName}</td>}
                <td className="max-w-xs">
                  <p>{f.purpose}</p>
                  {f.adminRemarks && <p className="mt-1 text-xs text-slate-500"><b>Remarks:</b> {f.adminRemarks}</p>}
                </td>
                <td className="whitespace-nowrap">
                  <p className="font-semibold">{inr(f.amount)}</p>
                  {f.status === 'approved' && <p className="text-xs text-emerald-600">{inr(f.approvedAmount)} approved</p>}
                </td>
                <td><StatusBadge status={f.status} /></td>
                <td><div className="flex flex-col gap-1">{docLink(f.businessPlan)}{docLink(f.supportingDocument)}{!f.businessPlan && !f.supportingDocument && <span className="text-slate-400">—</span>}</div></td>
                <td className="whitespace-nowrap text-slate-600">{fmtDate(f.requestDate)}</td>
                <td className="text-right">
                  {user.role === 'admin' && f.status === 'pending' && <Button size="sm" icon={Gavel} onClick={() => setDeciding(f)}>Review</Button>}
                  {user.role === 'student' && ['pending', 'modification_requested'].includes(f.status) && (
                    <Button size="sm" variant={f.status === 'modification_requested' ? 'primary' : 'secondary'} icon={Pencil}
                      onClick={() => setEditing({ id: f.id, startupId: f.startupId, purpose: f.purpose, amount: Number(f.amount), businessPlanId: f.businessPlan?.id, supportingDocumentId: f.supportingDocument?.id, adminRemarks: f.status === 'modification_requested' ? f.adminRemarks : null })}>
                      Modify
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && <RequestForm initial={editing} startups={eligible} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
      {deciding && <DecisionModal request={deciding} onClose={() => setDeciding(null)} onDone={() => { setDeciding(null); reload(); onChange?.(); }} />}
    </Card>
  );
}
