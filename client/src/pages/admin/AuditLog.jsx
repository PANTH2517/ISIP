import { useApi } from '../../hooks/useApi';
import { Badge, Card, EmptyState, ErrorBox, Loading, PageHeader } from '../../components/ui';
import { fmtDateTime } from '../../utils/format';

const METHOD_COLORS = { POST: 'green', PUT: 'blue', PATCH: 'indigo', DELETE: 'red' };

export default function AuditLog() {
  const { data, error, reload } = useApi('/reports/audit/logs?limit=300');
  return (
    <>
      <PageHeader title="Audit log" subtitle="Every state-changing action on the platform (latest 300)." />
      <ErrorBox error={error} onRetry={reload} />
      <Card bodyClassName="p-0 overflow-x-auto">
        {!data ? <Loading /> : data.length === 0 ? <EmptyState title="No activity recorded yet" /> : (
          <table className="table">
            <thead><tr><th>When</th><th>User</th><th>Action</th><th>Request</th><th>Result</th><th>IP</th></tr></thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap text-slate-600">{fmtDateTime(a.createdAt)}</td>
                  <td>{a.user ? <><p className="font-medium">{a.user.name}</p><p className="text-xs text-slate-500">{a.user.email}</p></> : <span className="text-slate-400">Anonymous</span>}</td>
                  <td>{a.action}</td>
                  <td className="whitespace-nowrap"><Badge color={METHOD_COLORS[a.method]}>{a.method}</Badge> <code className="text-xs text-slate-600">{a.path}</code></td>
                  <td><Badge color={a.statusCode < 400 ? 'green' : 'red'}>{a.statusCode}</Badge></td>
                  <td className="text-xs text-slate-500">{a.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
