import { Link } from 'react-router-dom';
import { Mail, Clock, MapPin } from 'lucide-react';
import { Emblem } from './Brand';
import { BRAND } from '../../config/brand';
import { useAuth } from '../../context/AuthContext';

const YEAR = new Date().getFullYear();

/** Institutional footer shared by the public site and the signed-in portal. */
export default function Footer({ compact = false }) {
  const { user } = useAuth();
  return (
    <footer className="mt-auto bg-indigo-950 text-indigo-100">
      {!compact && (
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <Emblem className="h-11 w-11" />
              <div>
                <p className="font-display text-lg font-bold text-white">{BRAND.name}</p>
                <p className="text-xs text-indigo-300">{BRAND.cell}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-indigo-200">
              A single-window portal for student startups: idea submission, verification, mentorship, milestones and investor funding.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Quick links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white hover:underline">Home</Link></li>
              <li><Link to="/#programmes" className="hover:text-white hover:underline">Programmes</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-white hover:underline">How it works</Link></li>
              <li><Link to="/#startups" className="hover:text-white hover:underline">Incubated startups</Link></li>
              <li><Link to="/#faq" className="hover:text-white hover:underline">FAQs</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">{user ? 'My account' : 'For stakeholders'}</h3>
            <ul className="space-y-2 text-sm">
              {user ? <>
                <li><Link to="/dashboard" className="hover:text-white hover:underline">My dashboard</Link></li>
                <li><Link to="/notifications" className="hover:text-white hover:underline">Notifications</Link></li>
                <li><Link to="/profile" className="hover:text-white hover:underline">My profile</Link></li>
              </> : <>
                <li><Link to="/register" className="hover:text-white hover:underline">Register a startup</Link></li>
                <li><Link to="/register?role=mentor" className="hover:text-white hover:underline">Join as a mentor</Link></li>
                <li><Link to="/register?role=investor" className="hover:text-white hover:underline">Join as an investor</Link></li>
                <li><Link to="/login" className="hover:text-white hover:underline">Portal login</Link></li>
              </>}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Help desk</h3>
            <ul className="space-y-2.5 text-sm text-indigo-200">
              <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{BRAND.cell}, {BRAND.institute}</li>
              <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><a href={`mailto:${BRAND.helpdesk}`} className="hover:text-white hover:underline">{BRAND.helpdesk}</a></li>
              <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0" />{BRAND.hours}</li>
            </ul>
          </div>
        </div>
      )}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-indigo-300 lg:px-8">
          <p>© {YEAR} {BRAND.name} · {BRAND.cell}, {BRAND.institute}. All rights reserved.</p>
          <p>{BRAND.lastUpdated && `Last updated: ${BRAND.lastUpdated} · `}Best viewed in the latest Chrome, Edge, Firefox or Safari</p>
        </div>
      </div>
      <div className="tricolor h-1" />
    </footer>
  );
}
