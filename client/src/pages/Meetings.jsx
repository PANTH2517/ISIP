import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { Loading, PageHeader } from '../components/ui';
import MeetingsPanel from '../components/MeetingsPanel';
import { useState } from 'react';
import { Mic } from 'lucide-react';
import InvestorMeetings from '../components/InvestorMeetings';
import { PitchRequestModal } from '../components/InvestorActions';
import { Button } from '../components/ui';

export default function Meetings() {
  const { user } = useAuth();
  const startups = useApi(user.role === 'student' ? '/startups' : null);
  const [pitching, setPitching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const subtitle = {
    student: 'Meet your mentors and pitch to investors. Request, confirm and track every meeting.',
    mentor: 'Schedule meetings with your startups and respond to their requests.',
    admin: 'All mentor meetings across the incubation cell.',
    investor: 'Pitches, intro calls and diligence meetings with startup founders.',
  }[user.role];
  if (user.role === 'investor') {
    return (
      <>
        <PageHeader title="Meetings" subtitle={subtitle} />
        <InvestorMeetings title="Founder meetings" />
      </>
    );
  }
  return (
    <>
      <PageHeader title="Meeting scheduler" subtitle={subtitle} />
      {user.role === 'student' && !startups.data ? <Loading /> : <MeetingsPanel startups={startups.data || []} />}
      {user.role !== 'mentor' && (
        <div className="mt-6">
          <InvestorMeetings
            title={user.role === 'student' ? 'Investor meetings' : 'Investor ↔ founder meetings'}
            refreshKey={refreshKey}
            action={user.role === 'student' && <Button size="sm" icon={Mic} onClick={() => setPitching(true)}>Pitch to an investor</Button>}
          />
        </div>
      )}
      {pitching && <PitchRequestModal onClose={() => setPitching(false)} onDone={() => { setPitching(false); setRefreshKey((k) => k + 1); }} />}
    </>
  );
}
