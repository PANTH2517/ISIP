import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, Download, Trash2, FileText, FileImage, Presentation, History } from 'lucide-react';
import api, { downloadFile, errMsg } from '../../../api/client';
import { useApi } from '../../../hooks/useApi';
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Loading, Modal } from '../../../components/ui';
import { fileSize, fmtDateTime } from '../../../utils/format';

const CATEGORIES = ['Pitch Deck', 'Business Plan', 'Prototype Image', 'Presentation', 'Report', 'Other'];
const ACCEPT = '.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt';

const iconFor = (t) => (['png', 'jpg', 'jpeg', 'webp'].includes(t) ? FileImage : ['ppt', 'pptx'].includes(t) ? Presentation : FileText);

export default function DocumentsTab({ startup, canUpload }) {
  const { data, error, reload } = useApi(`/documents?startupId=${startup.id}`);
  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState(null);
  const fileRef = useRef(null);

  const groups = Object.values((data || []).reduce((acc, d) => ((acc[d.fileName] ||= []).push(d), acc), {}));

  const upload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error('Choose a file');
    const body = new FormData();
    body.append('startupId', startup.id);
    body.append('title', form.title);
    body.append('category', form.category);
    body.append('file', file);
    setUploading(true);
    try {
      const { data: doc } = await api.post('/documents', body);
      toast.success(doc.version > 1 ? `Uploaded as version ${doc.version}` : 'Document uploaded');
      setForm(null);
      reload();
    } catch (err) { toast.error(errMsg(err)); } finally { setUploading(false); }
  };

  const download = (d) => downloadFile(`/documents/${d.id}/download`, d.originalName).catch((e) => toast.error(errMsg(e)));
  const remove = async (d) => {
    if (!window.confirm(`Delete ${d.fileName} v${d.version}?`)) return;
    try { await api.delete(`/documents/${d.id}`); toast.success('Deleted'); reload(); setHistory(null); } catch (e) { toast.error(errMsg(e)); }
  };

  const newVersion = (g) => setForm({ title: g[0].fileName, category: g[0].category, locked: true });

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <Card title="Document repository" subtitle="Pitch decks, business plans, prototype images — with version history"
      action={canUpload && <Button size="sm" icon={Upload} onClick={() => setForm({ title: '', category: 'Pitch Deck' })}>Upload document</Button>} bodyClassName="p-0">
      {groups.length === 0 ? <EmptyState icon={FileText} title="No documents yet" text={canUpload ? 'Upload your pitch deck, business plan or prototype images.' : 'The founder has not uploaded any documents.'} /> : (
        <ul className="divide-y divide-slate-100">
          {groups.map((g) => {
            const latest = g[0];
            const Icon = iconFor(latest.fileType);
            return (
              <li key={latest.fileName} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600"><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-slate-800">{latest.fileName} <Badge color="indigo">v{latest.version}</Badge> <Badge>{latest.category}</Badge></p>
                  <p className="text-xs text-slate-500">{latest.fileType.toUpperCase()} · {fileSize(latest.size)} · uploaded {fmtDateTime(latest.uploadedAt)} by {latest.uploadedBy?.name}</p>
                </div>
                <div className="flex gap-1">
                  {g.length > 1 && <Button size="sm" variant="ghost" icon={History} onClick={() => setHistory(g)}>{g.length} versions</Button>}
                  {canUpload && <Button size="sm" variant="ghost" icon={Upload} onClick={() => newVersion(g)}>New version</Button>}
                  <Button size="sm" variant="secondary" icon={Download} onClick={() => download(latest)}>Download</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.locked ? `Upload new version of "${form.title}"` : 'Upload document'}>
        {form && (
          <form onSubmit={upload} className="space-y-4">
            {!form.locked && <Field label="Document title" hint="Uploading again with the same title creates a new version"><input className="input" placeholder="e.g. Pitch Deck" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>}
            <Field label="Category">
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="File" required hint="PDF, PPT, Word, Excel or images · max 10 MB"><input ref={fileRef} type="file" required accept={ACCEPT} className="input file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-indigo-700" /></Field>
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" icon={Upload} loading={uploading}>Upload</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!history} onClose={() => setHistory(null)} title={`Version history · ${history?.[0].fileName}`}>
        {history && (
          <ul className="space-y-2">
            {history.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <Badge color={d === history[0] ? 'green' : 'gray'}>v{d.version}</Badge>
                <div className="min-w-0 flex-1 text-sm"><p className="truncate">{d.originalName}</p><p className="text-xs text-slate-500">{fmtDateTime(d.uploadedAt)} · {fileSize(d.size)}</p></div>
                <Button size="sm" variant="ghost" icon={Download} onClick={() => download(d)} aria-label="Download" />
                {canUpload && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(d)} aria-label="Delete" />}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </Card>
  );
}
