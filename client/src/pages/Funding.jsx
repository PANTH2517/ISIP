import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, PageHeader } from '../components/ui';
import TransactionsPanel from '../components/TransactionsPanel';

const FILTERS = [
  ['under_review,on_hold', 'Needs action'], ['under_review', 'Under review'], ['on_hold', 'On hold'],
  ['cleared', 'Cleared'], ['cancelled', 'Cancelled'], ['', 'All'],
];

/** Funding = investor deals. Admins review them (clear / hold / cancel); founders track their status. */
export default function Funding() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [clearance, setClearance] = useState(isAdmin ? 'under_review,on_hold' : '');

  return (
    <>
      <PageHeader
        title={isAdmin ? 'Funding transactions' : 'Funding'}
        subtitle={isAdmin
          ? 'Deals agreed between founders and investors. Clear, hold or cancel each one.'
          : 'Your startup is funded by investors. Offers you accept are checked by the StartIn team before they count as finance.'}
        actions={!isAdmin && <Link to="/investors"><Button icon={Briefcase}>Pitch to investors</Button></Link>}
      />
      {!isAdmin && (
        <div className="mb-5 flex gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-slate-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" />
          <p>
            <b>How funding works:</b> pitch to an investor or wait for an offer, then accept it on your startup&apos;s <b>Investors</b> tab.
            The StartIn team then clears the transaction (or puts it on hold if something is missing). Once cleared, it counts as finance and an approved startup is incubated.
          </p>
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.filter(([v]) => isAdmin || v !== 'under_review,on_hold').map(([v, l]) => (
          <button key={l} onClick={() => setClearance(v)} className={`rounded-full px-3 py-1 text-sm font-medium ${clearance === v ? 'bg-indigo-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{l}</button>
        ))}
      </div>
      <TransactionsPanel key={clearance} clearance={clearance} />
    </>
  );
}
