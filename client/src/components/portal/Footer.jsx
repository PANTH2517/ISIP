import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Wordmark } from './Brand';
import { BRAND } from '../../config/brand';
import { useAuth } from '../../context/AuthContext';

/** Footer of the public site. */
export default function Footer() {
  const { user } = useAuth();
  const link = 'text-slate-600 hover:text-indigo-600';
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <Wordmark />
          <p className="mt-3 max-w-sm text-sm text-slate-500">{BRAND.tagline} Submit your idea, work with mentors, hit your milestones and raise from investors, all in one place.</p>
          <a href={`mailto:${BRAND.support}`} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"><Mail className="h-4 w-4" />{BRAND.support}</a>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Product</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/#features" className={link}>Features</Link></li>
            <li><Link to="/#how-it-works" className={link}>How it works</Link></li>
            <li><Link to="/#startups" className={link}>Startups</Link></li>
            <li><Link to="/#faq" className={link}>FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">{user ? 'Account' : 'Get started'}</h3>
          <ul className="space-y-2 text-sm">
            {user ? <>
              <li><Link to="/dashboard" className={link}>Dashboard</Link></li>
              <li><Link to="/notifications" className={link}>Notifications</Link></li>
              <li><Link to="/profile" className={link}>Profile</Link></li>
            </> : <>
              <li><Link to="/register" className={link}>Register a startup</Link></li>
              <li><Link to="/register?role=mentor" className={link}>Become a mentor</Link></li>
              <li><Link to="/register?role=investor" className={link}>Join as an investor</Link></li>
              <li><Link to="/login" className={link}>Log in</Link></li>
            </>}
          </ul>
        </div>
      </div>
    </footer>
  );
}
