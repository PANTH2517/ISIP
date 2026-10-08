import { useState } from 'react';
import toast from 'react-hot-toast';
import { Bar } from 'react-chartjs-2';
import { FileBarChart, Download, Eye, FileText, Rocket, UserCheck, IndianRupee, Sprout, Briefcase } from 'lucide-react';
import api, { downloadFile, errMsg } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Button, Card, ErrorBox, Loading, PageHeader, StatCard } from '../../components/ui';
import { fmtDateTime, inr, inrShort } from '../../utils/format';
import { monthLabel } from '../../utils/charts';
import { StatusDoughnut, IndustryBar, MonthlyLine } from '../dashboards/AdminDashboard';

export default function Reports() {
  const summary = useApi('/reports/summary');
  const types = useApi('/reports/types');
  const history = useApi('/reports');
  const [type, setType] = useState('startups');
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/reports/generate', { reportType: type });
      setReport(data);
      history.reload();
      toast.success(`${data.title} generated`);
    } catch (e) { toast.error(errMsg(e)); } finally { setGenerating(false); }
  };
  const view = async (id) => {
    try { setReport((await api.get(`/reports/${id}`)).data); } catch (e) { toast.error(errMsg(e)); }
  };
  const csv = (id) => downloadFile(`/reports/${id}/csv`, `report-${id}.csv`).catch((e) => toast.error(errMsg(e)));
  const pdf = (id) => downloadFile(`/reports/${id}/pdf`, `report-${id}.pdf`).catch((e) => toast.error(errMsg(e)));

  if (summary.error && !summary.data) return <ErrorBox error={summary.error} onRetry={summary.reload} />;
  if (!summary.data || !types.data) return <Loading />;
  const s = summary.data;

  return (
    <>
      <PageHeader title="Reports" subtitle="Incubation statistics, generated reports and CSV exports." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Rocket} label="Number of startups" value={s.totals.startups} sub={`${s.totals.activeIncubations} incubated`} />
        <StatCard icon={IndianRupee} label="Awaiting clearance" value={inrShort(s.transactions.awaitingAmount)} sub={`${s.transactions.awaiting} transactions · ${s.transactions.byClearance.cancelled || 0} cancelled`} color="amber" />
        <StatCard icon={Sprout} label="Finance cleared" value={inrShort(s.transactions.clearedAmount)} sub={`${s.transactions.cleared} cleared transactions`} color="green" />
        <StatCard icon={UserCheck} label="Active mentors" value={s.totals.activeMentors} sub={`of ${s.totals.mentors} mentors`} color="sky" />
        <StatCard icon={Briefcase} label="Investor offers" value={s.investments.offers} sub={`${s.investments.pending} awaiting founders · ${s.transactions.total} accepted`} color="violet" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Industry-wise startups"><div className="h-64"><IndustryBar industry={s.industry} /></div></Card>
        <Card title="Startups by status"><div className="h-64"><StatusDoughnut byStatus={s.startupsByStatus} /></div></Card>
        <Card title="Monthly registrations"><div className="h-64"><MonthlyLine monthly={s.monthly} /></div></Card>
        <Card title="Finance cleared per month">
          <div className="h-64">
            <Bar
              data={{ labels: s.monthly.map((m) => monthLabel(m.month)), datasets: [{ label: 'Cleared (₹)', data: s.monthly.map((m) => m.financeCleared), backgroundColor: '#138808', borderRadius: 6, maxBarThickness: 40 }] }}
              options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => `₹${Number(v).toLocaleString('en-IN')}` } } } }}
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Generate report" className="lg:col-span-2"
          action={<div className="flex gap-2">
            <select className="input w-auto py-1.5" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(types.data).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Button icon={FileBarChart} loading={generating} onClick={generate}>Generate</Button>
          </div>}
          bodyClassName="p-0 overflow-x-auto">
          {!report ? <p className="p-5 text-sm text-slate-500">Choose a report type and click Generate. Generated reports are saved and can be exported as a PDF or as CSV (opens in Excel).</p> : (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div><p className="font-semibold">{report.title}</p><p className="text-xs text-slate-500">Generated {fmtDateTime(report.createdAt)} · {report.rows.length} rows</p></div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" icon={FileText} onClick={() => pdf(report.id)}>Export PDF</Button>
                  <Button size="sm" variant="secondary" icon={Download} onClick={() => csv(report.id)}>Export CSV</Button>
                </div>
              </div>
              <table className="table">
                <thead><tr>{report.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {report.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{typeof v === 'number' && /INR/.test(report.columns[j]) ? inr(v) : String(v ?? '')}</td>)}</tr>)}
                  {report.rows.length === 0 && <tr><td colSpan={report.columns.length} className="text-center text-slate-500">No data</td></tr>}
                </tbody>
              </table>
            </>
          )}
        </Card>
        <Card title="Report history" bodyClassName="p-0">
          {!history.data ? <Loading /> : history.data.length === 0 ? <p className="p-5 text-sm text-slate-500">No reports generated yet.</p> : (
            <ul className="divide-y divide-slate-100">
              {history.data.map((r) => (
                <li key={r.id} className="flex items-center gap-2 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{types.data[r.reportType] || r.reportType}</p>
                    <p className="text-xs text-slate-500">{fmtDateTime(r.createdAt)} · {r.generatedBy?.name}</p>
                  </div>
                  <Button size="sm" variant="ghost" icon={Eye} onClick={() => view(r.id)} aria-label="View" />
                  <Button size="sm" variant="ghost" icon={FileText} onClick={() => pdf(r.id)} aria-label="Download PDF" title="Download PDF" />
                  <Button size="sm" variant="ghost" icon={Download} onClick={() => csv(r.id)} aria-label="Download CSV" title="Download CSV" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
