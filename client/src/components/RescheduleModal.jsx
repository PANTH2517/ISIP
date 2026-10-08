import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { errMsg } from '../api/client';
import { Button, Field, Modal } from './ui';
import { fmtDate, fmtTime, todayISO } from '../utils/format';

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Shared "propose a new time" dialog for mentor and investor meetings.
 * `onSave({ date, time, note })` must throw on failure — the dialog then stays open and shows why.
 */
export default function RescheduleModal({ title = 'Propose a new time', current, hint, onClose, onSave }) {
  const upcoming = current?.date && current.date >= todayISO();
  const [form, setForm] = useState({ date: upcoming ? current.date : '', time: upcoming ? current.time || '' : '', note: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => { setError(''); setForm({ ...form, [k]: e.target.value }); };

  const unchanged = upcoming && form.date === current.date && form.time === current.time;

  const save = async (e) => {
    e.preventDefault();
    if (!form.date || !form.time) return setError('Please choose both a date and a time.');
    if (form.date < todayISO() || (form.date === todayISO() && form.time <= nowHHMM())) {
      return setError('That time has already passed. Please choose a time later than now.');
    }
    if (unchanged) return setError('Choose a different date or time from the current one.');
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(errMsg(err));
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={title}>
      <form onSubmit={save} className="space-y-4" noValidate>
        {current?.date && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Currently: <b className="text-slate-800">{fmtDate(current.date)}{current.time ? ` at ${fmtTime(current.time)}` : ''}</b>
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="New date" required><input className="input" type="date" min={todayISO()} value={form.date} onChange={set('date')} /></Field>
          <Field label="New time" required><input className="input" type="time" value={form.time} onChange={set('time')} /></Field>
        </div>
        <Field label="Note (optional)"><textarea className="input" rows={2} placeholder="e.g. Clashes with exams — does this work?" value={form.note} onChange={set('note')} /></Field>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save new time</Button>
        </div>
      </form>
    </Modal>
  );
}
