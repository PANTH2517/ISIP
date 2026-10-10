import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Save, KeyRound, Eye } from 'lucide-react';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Button, Card, Field, PageHeader } from '../components/ui';
import { fmtDate, INVESTOR_TYPES } from '../utils/format';

const ROLE_LABEL = { student: 'Student Entrepreneur', mentor: 'Mentor', investor: 'Investor', admin: 'Incubation Manager' };

export default function Profile() {
  const { user, setUser } = useAuth();
  const mp = user.mentorProfile || {};
  const ip = user.investorProfile || {};
  // "About" is stored on the mentor / investor profile for those roles, on the user for everyone else.
  const roleBio = user.role === 'mentor' ? mp.bio : user.role === 'investor' ? ip.bio : user.about;
  const [form, setForm] = useState({
    name: user.name, phone: user.phone || '', headline: user.headline || '', about: roleBio || '',
    skills: user.skills || '', linkedin: user.linkedin || '', website: user.website || ip.website || '',
    ...(user.role === 'mentor' && { expertise: mp.expertise || '', availability: mp.availability || '' }),
    ...(user.role === 'investor' && {
      firmName: ip.firmName || '', investorType: ip.investorType || 'Angel', focusIndustries: ip.focusIndustries || '',
      ticketMin: ip.ticketMin ?? '', ticketMax: ip.ticketMax ?? '',
    }),
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = { ...form };
    if (user.role === 'mentor' || user.role === 'investor') {
      body.bio = form.about;
      delete body.about;
    }
    if (user.role === 'investor') body.investorWebsite = form.website;
    try {
      const { data } = await api.put('/auth/profile', body);
      setUser(data);
      // Show the values as saved (e.g. links normalised to https://).
      setForm((f) => ({ ...f, linkedin: data.linkedin || '', website: data.website || data.investorProfile?.website || '' }));
      toast.success('Profile updated');
    } catch (err) { toast.error(errMsg(err)); } finally { setSaving(false); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return toast.error('New passwords do not match');
    setSavingPw(true);
    try {
      await api.put('/auth/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success('Password changed');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(errMsg(err)); } finally { setSavingPw(false); }
  };

  return (
    <>
      <PageHeader title="My profile" subtitle="Your public profile is visible to everyone on StartIn — founders, mentors and investors." actions={<Link to={`/people/${user.id}`}><Button variant="secondary" icon={Eye}>View public profile</Button></Link>} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Profile details">
          <div className="mb-6 flex items-center gap-4">
            <Avatar name={user.name} className="h-14 w-14 text-lg" />
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
              <div className="mt-1 flex flex-wrap gap-2"><Badge color="indigo">{ROLE_LABEL[user.role]}</Badge><Badge color="green">Member since {fmtDate(user.createdAt)}</Badge></div>
            </div>
          </div>
          <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" required><input className="input" required value={form.name} onChange={set('name')} /></Field>
            <Field label="Phone" hint="Private: only you and admins can see it. Stored encrypted"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
            <Field label="Headline" className="sm:col-span-2" hint="One line under your name, e.g. “Founder, AgriSense · B.Tech Electronics”">
              <input className="input" maxLength={160} value={form.headline} onChange={set('headline')} />
            </Field>
            <Field label="About" className="sm:col-span-2" hint="Your background, what you're building or looking for, and notable work">
              <textarea className="input" rows={5} value={form.about} onChange={set('about')} />
            </Field>
            {user.role === 'mentor' ? <>
              <Field label="Expertise" className="sm:col-span-2" hint="Comma-separated"><input className="input" value={form.expertise} onChange={set('expertise')} /></Field>
              <Field label="Availability" className="sm:col-span-2" hint="Shown to founders when they request meetings"><input className="input" value={form.availability} onChange={set('availability')} /></Field>
            </> : (
              <Field label="Skills" className="sm:col-span-2" hint="Comma-separated, e.g. React, Product Design, Fundraising"><input className="input" maxLength={400} value={form.skills} onChange={set('skills')} /></Field>
            )}
            <Field label="LinkedIn"><input className="input" placeholder="linkedin.com/in/your-name" value={form.linkedin} onChange={set('linkedin')} /></Field>
            <Field label="Website / portfolio"><input className="input" placeholder="yourwebsite.com" value={form.website} onChange={set('website')} /></Field>
            {user.role === 'investor' && <>
              <Field label="Firm / fund name"><input className="input" value={form.firmName} onChange={set('firmName')} /></Field>
              <Field label="Investor type"><select className="input" value={form.investorType} onChange={set('investorType')}>{INVESTOR_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Focus industries" className="sm:col-span-2" hint="Comma-separated, used to recommend startups on your dashboard"><input className="input" value={form.focusIndustries} onChange={set('focusIndustries')} /></Field>
              <Field label="Min ticket (₹)"><input className="input" type="number" min="0" value={form.ticketMin} onChange={set('ticketMin')} /></Field>
              <Field label="Max ticket (₹)"><input className="input" type="number" min="0" value={form.ticketMax} onChange={set('ticketMax')} /></Field>
            </>}
            <div className="sm:col-span-2"><Button type="submit" icon={Save} loading={saving}>Save profile</Button></div>
          </form>
        </Card>
        <Card title="Change password">
          <form onSubmit={changePw} className="space-y-4">
            <Field label="Current password"><input className="input" type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
            <Field label="New password" hint="Min 8 characters, a letter and a number"><input className="input" type="password" required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
            <Field label="Confirm new password"><input className="input" type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
            <Button type="submit" icon={KeyRound} loading={savingPw} className="w-full">Update password</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
