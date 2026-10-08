import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { Loading, PageHeader } from '../components/ui';
import FundingPanel from '../components/FundingPanel';

const FILTERS = [['', 'All'], ['pending', 'Pending'], ['modification_requested', 'Changes requested'], ['approved', 'Approved'], ['rejected', 'Rejected']];

export default function Funding() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [status, setStatus] = useState(isAdmin ? 'pending' : '');
  const startups = useApi(isAdmin ? null : '/startups');

  return (
    <>
      <PageHeader
        title={isAdmin ? 'Funding requests' : 'Funding'}
        subtitle={isAdmin ? 'Approve, reject or request modifications on funding applications.' : 'Apply for funding and track the status of every request.'}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => setStatus(v)} className={`rounded-full px-3 py-1 text-sm font-medium ${status === v ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{l}</button>
        ))}
      </div>
      {!isAdmin && !startups.data ? <Loading /> : <FundingPanel key={status} statusFilter={status} startups={startups.data || []} canCreate={!isAdmin} />}
    </>
  );
}
