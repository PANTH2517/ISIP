import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Pencil, Send, Trash2, CheckCircle2, XCircle, Sprout, Info, Users, Target, FileText, CalendarDays,
  MessageSquare, UserPlus, X, Briefcase, Handshake, CalendarPlus, Landmark,
} from 'lucide-react';
import api, { errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { Avatar, Button, Card, ErrorBox, Field, InfoRow, Loading, Modal, ProgressBar, StatusBadge, Stars, Tabs } from '../../components/ui';
import { fmtDate, inr, plural } from '../../utils/format';
import TeamTab from './tabs/TeamTab';
import MilestonesTab from './tabs/MilestonesTab';
import DocumentsTab from './tabs/DocumentsTab';
import FeedbackTab from './tabs/FeedbackTab';
import MeetingsPanel from '../../components/MeetingsPanel';
import InvestorsTab from './tabs/InvestorsTab';
import { OfferModal, InvestorMeetingModal } from '../../components/InvestorActions';
import PersonLink from '../../components/PersonLink';

function StatusModal({ startup, target, onClose, onDone }) {
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const labels = { approved: 'Approve startup', rejected: 'Reject startup', incubated: 'Accept into incubation' };
  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/startups/${startup.id}/status`, { status: target, remarks });
      toast.success(`${startup.startupName} ${target}`);
      onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={labels[target]}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={target === 'rejected' ? 'danger' : 'success'} loading={saving} onClick={save}>{labels[target]}</Button></>}>
      <p className="mb-3 text-sm text-slate-600">
        {target === 'approved' && 'Approving creates the default milestone plan (Idea Validation → Funding) and notifies the founder.'}
        {target === 'incubated' && 'The startup has secured finance and will be marked as an active incubation.'}
        {target === 'rejected' && 'The founder will be notified and can revise and resubmit.'}
      </p>
      <Field label={target === 'rejected' ? 'Reason for rejection' : 'Remarks (optional)'} required={target === 'rejected'}>
        <textarea className="input" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </Field>
    </Modal>
  );
}

function AssignMentorModal({ startup, onClose, onDone }) {
  const { data: mentors } = useApi('/mentors');
  const [mentorId, setMentorId] = useState('');
  const [saving, setSaving] = useState(false);
  const assigned = new Set(startup.assignments.map((a) => a.mentorId));
  const save = async () => {
    setSaving(true);
    try {
      await api.post('/mentors/assignments', { startupId: startup.id, mentorId });
      toast.success('Mentor assigned');
      onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Assign mentor to ${startup.startupName}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!mentorId} loading={saving} onClick={save}>Assign</Button></>}>
      {!mentors ? <Loading /> : (
        <div className="space-y-2">
          {mentors.filter((m) => !assigned.has(m.id)).map((m) => (
            <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${String(mentorId) === String(m.id) ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input type="radio" name="mentor" className="mt-1" checked={String(mentorId) === String(m.id)} onChange={() => setMentorId(m.id)} />
              <div className="flex-1">
                <p className="text-sm font-medium"><PersonLink id={m.user.id} name={m.user.name} /> <span className="font-normal text-slate-500">· {plural(m.activeAssignments, 'active startup')}</span></p>
                <p className="text-xs text-slate-500">{m.expertise || 'No expertise listed'}</p>
              </div>
              {m.rating > 0 && <Stars value={m.rating} size="h-3.5 w-3.5" />}
            </label>
          ))}
          {mentors.filter((m) => !assigned.has(m.id)).length === 0 && <p className="text-sm text-slate-500">All mentors are already assigned to this startup.</p>}
        </div>
      )}
    </Modal>
  );
}

export default function StartupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: s, error, reload } = useApi(`/startups/${id}`);
  const [statusTarget, setStatusTarget] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [investorAction, setInvestorAction] = useState(null); // 'offer' | 'meeting'
  const myOffers = useApi(user.role === 'investor' ? `/investors/interests?startupId=${id}` : null);
  const requestedTab = params.get('tab') || 'overview';
  useEffect(() => {
    if (s?.startupName) document.title = `${s.startupName} · StartIn`;
  }, [s?.startupName]);

  if (error && !s) return <ErrorBox error={error} onRetry={reload} />;
  if (!s) return <Loading />;

  const isOwner = user.role === 'student' && s.createdById === user.id;
  const isAdmin = user.role === 'admin';
  const isInvestor = user.role === 'investor';
  const active = ['approved', 'incubated'].includes(s.status);
  const finance = s.finance || {};
  const myLatestOffer = myOffers.data?.[0];
  const hasOpenOffer = myOffers.data?.some((o) => o.status === 'pending');

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/startups/${s.id}/submit`);
      toast.success('Submitted for verification!');
      reload();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete "${s.startupName}"? This also removes its documents, milestones and requests.`)) return;
    try {
      await api.delete(`/startups/${s.id}`);
      toast.success('Startup deleted');
      navigate('/startups');
    } catch (e) { toast.error(errMsg(e)); }
  };
  const unassign = async (a) => {
    if (!window.confirm(`Remove ${a.mentor.user.name} from ${s.startupName}?`)) return;
    try {
      await api.delete(`/mentors/assignments/${a.id}`);
      toast.success('Mentor removed');
      reload();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'team', label: 'Team', icon: Users, count: s.members.length },
    ...(active ? [{ id: 'milestones', label: 'Milestones', icon: Target }] : []),
    { id: 'documents', label: 'Documents', icon: FileText },
    ...(active && (isOwner || isAdmin) ? [{ id: 'investors', label: 'Investors', icon: Briefcase }] : []),
    ...(active && !isInvestor ? [{ id: 'meetings', label: 'Meetings', icon: CalendarDays }] : []),
    ...(active && !isInvestor ? [{ id: 'feedback', label: 'Mentor feedback', icon: MessageSquare }] : []),
  ];
  // Funding lives on the Investors tab now; old ?tab=funding links land there.
  const wanted = requestedTab === 'funding' ? 'investors' : requestedTab;
  const tab = tabs.some((t) => t.id === wanted) ? wanted : 'overview';
  const setTab = (t) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });

  return (
    <>
      <Link to="/startups" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Back to startups</Link>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl font-bold text-white">{s.startupName[0]}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{s.startupName}</h1>
                <StatusBadge status={s.status} />
              </div>
              <p className="mt-0.5 text-sm text-slate-500">{s.industry} · Founded by <PersonLink id={s.founder.id} name={s.founder.name} className="font-medium text-slate-700" /> · Created {fmtDate(s.createdAt)}</p>
              {s.rating > 0 && <div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><Stars value={s.rating} /> {s.rating} mentor rating</div>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner && <Link to={`/startups/${s.id}/edit`}><Button variant="secondary" icon={Pencil}>Edit</Button></Link>}
            {isOwner && ['draft', 'rejected'].includes(s.status) && <Button icon={Send} loading={busy} onClick={submit}>{s.status === 'rejected' ? 'Resubmit' : 'Submit for verification'}</Button>}
            {isAdmin && s.status === 'pending' && <>
              <Button variant="success" icon={CheckCircle2} onClick={() => setStatusTarget('approved')}>Approve</Button>
              <Button variant="danger" icon={XCircle} onClick={() => setStatusTarget('rejected')}>Reject</Button>
            </>}
            {isAdmin && s.status === 'approved' && (
              <span title={finance.financed ? '' : 'Incubation unlocks once the startup secures finance'}>
                <Button variant="success" icon={Sprout} disabled={!finance.financed} onClick={() => setStatusTarget('incubated')}>Mark as incubated</Button>
              </span>
            )}
            {isInvestor && <>
              <Button icon={Handshake} disabled={hasOpenOffer} title={hasOpenOffer ? 'You already have a pending offer' : ''} onClick={() => setInvestorAction('offer')}>Make an offer</Button>
              <Button variant="secondary" icon={CalendarPlus} onClick={() => setInvestorAction('meeting')}>Request meeting</Button>
            </>}
            {isAdmin && active && <Button variant="soft" icon={UserPlus} onClick={() => setAssignOpen(true)}>Assign mentor</Button>}
            {((isOwner && ['draft', 'pending', 'rejected'].includes(s.status)) || isAdmin) && <Button variant="ghost" icon={Trash2} onClick={remove} aria-label="Delete startup" />}
          </div>
        </div>
        {active && <div className="mt-5"><p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Milestone progress</p><ProgressBar value={s.progress} /></div>}
        {s.adminRemarks && (
          <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${s.status === 'rejected' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
            <span className="font-semibold">Incubation manager remarks:</span> {s.adminRemarks}
          </div>
        )}
        {s.status === 'approved' && !isInvestor && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Landmark className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b>Awaiting finance.</b> This startup moves into incubation once an investor deal is accepted by the founder and cleared by the Incubation Cell.
              {isOwner && <> See the <button className="font-semibold underline" onClick={() => setTab('investors')}>Investors</button> tab.</>}
            </span>
          </div>
        )}
        {isInvestor && myLatestOffer && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            Your latest offer: <b>{inr(myLatestOffer.amount)}</b> ({myLatestOffer.instrument}{myLatestOffer.equity ? `, ${myLatestOffer.equity}%` : ''}) <StatusBadge status={myLatestOffer.status} />
            {myLatestOffer.founderNote && <span className="text-indigo-700">· Founder: “{myLatestOffer.founderNote}”</span>}
          </div>
        )}
        {s.status === 'draft' && isOwner && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">This startup is a draft. Complete the idea details and submit it for verification.</div>}
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="About the startup" className="lg:col-span-2">
            <dl className="grid gap-5">
              <InfoRow label="Description">{s.description}</InfoRow>
              <InfoRow label="Problem statement">{s.problemStatement}</InfoRow>
              <InfoRow label="Solution">{s.solution}</InfoRow>
              <InfoRow label="Business model">{s.businessModel}</InfoRow>
              <InfoRow label="Technology stack">{s.technologyStack}</InfoRow>
            </dl>
          </Card>
          <div className="space-y-6">
            <Card title="Mentors">
              {s.assignments.length === 0 ? <p className="text-sm text-slate-500">{active ? 'No mentor assigned yet.' : 'Mentors are assigned after approval.'}</p> : (
                <ul className="space-y-3">
                  {s.assignments.map((a) => (
                    <li key={a.id} className="flex items-center gap-3">
                      <Avatar name={a.mentor.user.name} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium"><PersonLink id={a.mentor.user.id} name={a.mentor.user.name} /></p>
                        <p className="text-xs text-slate-500">{a.mentor.expertise}</p>
                        {a.status === 'assigned' && <StatusBadge status="assigned" />}
                      </div>
                      {isAdmin && <button onClick={() => unassign(a)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove mentor"><X className="h-4 w-4" /></button>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {active && (
              <Card title="Finance secured">
                <p className="text-2xl font-bold text-slate-900">{inr(finance.total || 0)}</p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Investors on board</dt><dd className="font-medium">{finance.investors || 0}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Awaiting clearance</dt><dd className="font-medium">{inr(finance.awaitingClearance || 0)}</dd></div>
                </dl>
              </Card>
            )}
            <Card title="Founder">
              <div className="flex items-center gap-3">
                <Avatar name={s.founder.name} />
                <div><p className="text-sm font-medium"><PersonLink id={s.founder.id} name={s.founder.name} /></p><p className="text-xs text-slate-500">{s.founder.email}</p></div>
              </div>
            </Card>
          </div>
        </div>
      )}
      {tab === 'team' && <TeamTab startup={s} canEdit={isOwner || isAdmin} reload={reload} />}
      {tab === 'milestones' && <MilestonesTab startup={s} role={user.role} isOwner={isOwner} onChange={reload} />}
      {tab === 'documents' && <DocumentsTab startup={s} canUpload={isOwner || isAdmin} />}
      {tab === 'meetings' && <MeetingsPanel startupId={s.id} />}
      {tab === 'feedback' && <FeedbackTab startup={s} role={user.role} onChange={reload} />}
      {tab === 'investors' && <InvestorsTab startup={s} canRespond={isOwner} onChange={reload} />}

      {investorAction === 'offer' && <OfferModal startup={s} onClose={() => setInvestorAction(null)} onDone={() => { setInvestorAction(null); myOffers.reload(); }} />}
      {investorAction === 'meeting' && <InvestorMeetingModal startup={s} onClose={() => setInvestorAction(null)} onDone={() => setInvestorAction(null)} />}

      {statusTarget && <StatusModal startup={s} target={statusTarget} onClose={() => setStatusTarget(null)} onDone={() => { setStatusTarget(null); reload(); }} />}
      {assignOpen && <AssignMentorModal startup={s} onClose={() => setAssignOpen(false)} onDone={() => { setAssignOpen(false); reload(); }} />}
    </>
  );
}
