import { useState } from 'react';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import api, { errMsg } from '../api/client';
import { Button, Field, Loading, Modal } from './ui';
import { useApi } from '../hooks/useApi';
import { INSTRUMENTS, inr, inrShort, todayISO } from '../utils/format';

/** Investor → "Show investment interest" in a startup. */
export function OfferModal({ startup, onClose, onDone }) {
  const [form, setForm] = useState({ amount: '', equity: '', instrument: 'Equity', message: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valuation = form.amount && form.equity ? (Number(form.amount) * 100) / Number(form.equity) : null;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/investors/interests', { ...form, startupId: startup.id });
      toast.success(`Offer sent to ${startup.startupName}`);
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Make an offer · ${startup.startupName}`}>
      <form onSubmit={save} className="space-y-4">
        <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          The founder will be notified and can accept or decline. An accepted offer counts as secured finance and moves the startup into incubation.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Amount (₹)" required><input className="input" type="number" min="1" required value={form.amount} onChange={set('amount')} /></Field>
          <Field label="Instrument"><select className="input" value={form.instrument} onChange={set('instrument')}>{INSTRUMENTS.map((i) => <option key={i}>{i}</option>)}</select></Field>
          <Field label="Equity (%)" hint={valuation ? `Implied post-money valuation ${inr(valuation)}` : 'Optional'}>
            <input className="input" type="number" min="0.1" max="100" step="0.1" value={form.equity} onChange={set('equity')} />
          </Field>
        </div>
        <Field label="Message to the founder"><textarea className="input" rows={4} value={form.message} onChange={set('message')} placeholder="Why you're interested, terms, next steps…" /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" icon={Send} loading={saving}>Send offer</Button></div>
      </form>
    </Modal>
  );
}

const KIND_OPTIONS = { intro: 'Intro call', due_diligence: 'Due diligence', follow_up: 'Follow-up', pitch: 'Pitch' };

/** Investor → request a meeting with a startup's founder. */
export function InvestorMeetingModal({ startup, onClose, onDone }) {
  const [form, setForm] = useState({ kind: 'intro', date: '', time: '', location: '', agenda: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/investors/meetings', { ...form, startupId: startup.id });
      toast.success('Meeting request sent to the founder');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Request a meeting · ${startup.startupName}`}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Meeting type"><select className="input" value={form.kind} onChange={set('kind')}>{Object.entries(KIND_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" required><input className="input" type="date" min={todayISO()} required value={form.date} onChange={set('date')} /></Field>
          <Field label="Time" required><input className="input" type="time" required value={form.time} onChange={set('time')} /></Field>
        </div>
        <Field label="Location or meeting link" hint="e.g. https://meet.google.com/… or Incubation Cell, Room 2"><input className="input" value={form.location} onChange={set('location')} /></Field>
        <Field label="Agenda"><textarea className="input" rows={3} value={form.agenda} onChange={set('agenda')} placeholder="What would you like to discuss?" /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>Send request</Button></div>
      </form>
    </Modal>
  );
}

/**
 * Founder → request a pitch (or other) meeting with an investor.
 * Pass `investor` to pre-select one (from their profile / directory card); otherwise the founder picks.
 */
export function PitchRequestModal({ investor: preset, onClose, onDone }) {
  const startups = useApi('/startups');
  const directory = useApi(preset ? null : '/investors/directory');
  const eligible = (startups.data || []).filter((s) => ['approved', 'incubated'].includes(s.status));
  const [form, setForm] = useState({ investorId: preset?.id || '', startupId: '', kind: 'pitch', date: '', time: '', askAmount: '', deckId: '', location: '', agenda: '' });
  const startupId = form.startupId || (eligible.length === 1 ? eligible[0].id : '');
  const docs = useApi(startupId ? `/documents?startupId=${startupId}` : null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  // Latest version of each document, pitch decks first.
  const deckOptions = Object.values((docs.data || []).reduce((acc, d) => { acc[d.fileName] ||= d; return acc; }, {}))
    .sort((a, b) => (b.category === 'Pitch Deck') - (a.category === 'Pitch Deck'));
  const investorName = preset ? `${preset.name}${preset.firmName ? ` · ${preset.firmName}` : ''}` : null;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/investors/meetings', { ...form, startupId, deckId: form.deckId || null });
      toast.success('Pitch request sent! The investor will confirm or propose another time.');
      onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={investorName ? `Request a meeting · ${investorName}` : 'Pitch to an investor'} size="lg">
      {!startups.data ? <Loading /> : eligible.length === 0 ? (
        <p className="text-sm text-slate-600">Your startup needs to be <b>approved</b> by the incubation manager before you can pitch to investors.</p>
      ) : (
        <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!preset && (
            <Field label="Investor" required className="sm:col-span-2">
              <select className="input" required value={form.investorId} onChange={set('investorId')}>
                <option value="">Select an investor…</option>
                {(directory.data || []).map((i) => <option key={i.id} value={i.id}>{i.name}{i.firmName ? ` · ${i.firmName}` : ''} ({i.investorType})</option>)}
              </select>
            </Field>
          )}
          {eligible.length > 1 && (
            <Field label="Startup" required>
              <select className="input" required value={form.startupId} onChange={(e) => setForm({ ...form, startupId: e.target.value, deckId: '' })}>
                <option value="">Select…</option>
                {eligible.map((s) => <option key={s.id} value={s.id}>{s.startupName}</option>)}
              </select>
            </Field>
          )}
          <Field label="Meeting type"><select className="input" value={form.kind} onChange={set('kind')}>{Object.entries(KIND_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Date" required><input className="input" type="date" min={todayISO()} required value={form.date} onChange={set('date')} /></Field>
          <Field label="Time" required><input className="input" type="time" required value={form.time} onChange={set('time')} /></Field>
          {form.kind === 'pitch' && <>
            <Field label="Funding ask (₹)" hint={form.askAmount ? `≈ ${inrShort(form.askAmount)}` : 'How much are you raising?'}><input className="input" type="number" min="1" value={form.askAmount} onChange={set('askAmount')} /></Field>
            <Field label="Pitch deck" hint={deckOptions.length ? 'Shared with the investor' : "Upload a pitch deck in your startup's Documents tab"}>
              <select className="input" value={form.deckId} onChange={set('deckId')} disabled={!deckOptions.length}>
                <option value="">None</option>
                {deckOptions.map((d) => <option key={d.id} value={d.id}>{d.fileName} (v{d.version})</option>)}
              </select>
            </Field>
          </>}
          <Field label="Location or meeting link" className="sm:col-span-2" hint="e.g. https://meet.google.com/… or Incubation Cell, Room 2"><input className="input" value={form.location} onChange={set('location')} /></Field>
          <Field label="What you'd like to cover" className="sm:col-span-2"><textarea className="input" rows={3} value={form.agenda} onChange={set('agenda')} placeholder="e.g. 10-minute pitch, traction so far, use of funds, Q&A" /></Field>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" icon={Send} loading={saving}>Send request</Button></div>
        </form>
      )}
    </Modal>
  );
}
