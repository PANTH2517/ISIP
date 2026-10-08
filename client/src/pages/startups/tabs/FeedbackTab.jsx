import { useState } from 'react';
import toast from 'react-hot-toast';
import { MessageSquare, Send } from 'lucide-react';
import api, { errMsg } from '../../../api/client';
import { useApi } from '../../../hooks/useApi';
import { Avatar, Button, Card, EmptyState, ErrorBox, Field, Loading, Stars } from '../../../components/ui';
import { fmtDateTime } from '../../../utils/format';
import PersonLink from '../../../components/PersonLink';

export default function FeedbackTab({ startup, role, onChange }) {
  const { data, error, reload } = useApi(`/feedback?startupId=${startup.id}`);
  const [form, setForm] = useState({ comments: '', rating: 0 });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/feedback', { startupId: startup.id, comments: form.comments, rating: form.rating || null });
      toast.success('Feedback shared with the founder');
      setForm({ comments: '', rating: 0 });
      reload();
      onChange();
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card title="Mentor feedback & suggestions" className={role === 'mentor' ? 'lg:col-span-2' : 'lg:col-span-3'} bodyClassName="p-0">
        {data.length === 0 ? <EmptyState icon={MessageSquare} title="No feedback yet" text="Mentor comments and suggestions will appear here." /> : (
          <ul className="divide-y divide-slate-100">
            {data.map((f) => (
              <li key={f.id} className="flex gap-3 px-5 py-4">
                <Avatar name={f.mentor.user.name} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium"><PersonLink id={f.mentor.user.id} name={f.mentor.user.name} /></p>
                    {f.rating && <Stars value={f.rating} size="h-3.5 w-3.5" />}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{f.comments}</p>
                  <p className="mt-1 text-xs text-slate-400">{fmtDateTime(f.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {role === 'mentor' && (
        <Card title="Add suggestion & rate progress">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <span className="label">Progress rating</span>
              <Stars value={form.rating} onChange={(rating) => setForm({ ...form, rating: rating === form.rating ? 0 : rating })} size="h-6 w-6" />
            </div>
            <Field label="Feedback / suggestions" required><textarea className="input" rows={5} required value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} /></Field>
            <Button type="submit" icon={Send} loading={saving} className="w-full">Share feedback</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
