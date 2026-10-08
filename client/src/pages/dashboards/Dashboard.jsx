import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { ErrorBox, Loading } from '../../components/ui';
import StudentDashboard from './StudentDashboard';
import MentorDashboard from './MentorDashboard';
import AdminDashboard from './AdminDashboard';
import InvestorDashboard from './InvestorDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, reload } = useApi('/dashboard');
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const View = { student: StudentDashboard, mentor: MentorDashboard, admin: AdminDashboard, investor: InvestorDashboard }[user.role];
  return <View data={data} reload={reload} user={user} />;
}
