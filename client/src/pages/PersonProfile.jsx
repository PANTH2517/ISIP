import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Link2, Globe, CalendarDays, Pencil, Rocket, Sprout, Landmark, Target, Award, Users,
  MessageSquare, Handshake, Trophy, Clock, Briefcase, Mic,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { PitchRequestModal } from '../components/InvestorActions';
import { Avatar, Badge, Button, Card, EmptyState, ErrorBox, Loading, ProgressBar, StatusBadge, Stars } from '../components/ui';
import { fmtDate, inr, inrShort, ticketRange } from '../utils/format';


const ROLE = {
  student: ['Student Entrepreneur', 'indigo'], mentor: ['Mentor', 'green'], investor: ['Investor', 'purple'], admin: ['Incubation Manager', 'blue'],
};
const ACHIEVEMENT_ICONS = { rocket: Rocket, sprout: Sprout, landmark: Landmark, target: Target, award: Award, users: Users, message: MessageSquare, calendar: CalendarDays, handshake: Handshake };

function StartupTile({ s, extra }) {
  const name = s.canOpen
    ? <Link to={`/startups/${s.id}`} className="font-semibold text-slate-800 hover:text-indigo-600">{s.startupName}</Link>
    : <span className="font-semibold text-slate-800">{s.startupName}</span>;
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 font-bold text-white">{s.startupName[0]}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">{name}<StatusBadge status={s.status} /></div>
          <p className="text-xs text-slate-500">{s.industry}{extra ? ` · ${extra}` : ''}</p>
        </div>
      </div>
      {s.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{s.description}</p>}
      {['approved', 'incubated'].includes(s.status) && <ProgressBar value={s.progress} className="mt-3" />}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {s.finance?.total > 0 && <span>Raised <b className="text-slate-800">{inrShort(s.finance.total)}</b></span>}
        {s.rating > 0 && <span className="flex items-center gap-1"><Stars value={s.rating} size="h-3 w-3" /> mentor rating</span>}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children, count }) {
  return (
    <Card title={<span className="flex items-center gap-2">{Icon && <Icon className="h-4 w-4 text-slate-400" />}{title}{count ? <span className="text-sm font-normal text-slate-400">({count})</span> : null}</span>}>
      {children}
    </Card>
  );
}

const Chips = ({ items, color = 'gray' }) => (
  <div className="flex flex-wrap gap-2">{items.map((s) => <Badge key={s} color={color}>{s}</Badge>)}</div>
);

export default function PersonProfile() {
  const { id } = useParams();
  const { data, error, reload } = useApi(`/people/${id}`);
  const { user } = useAuth();
  const [pitching, setPitching] = useState(false);

  useEffect(() => {
    if (data?.person) document.title = `${data.person.name} · StartIn`;
  }, [data]);

  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const { person, isSelf, stats = [], achievements = [], mentor, investor } = data;
  const [roleLabel, roleColor] = ROLE[person.role] || [person.role, 'gray'];
  const about = person.about || mentor?.bio || investor?.bio;
  const website = person.website || investor?.website;
  const skills = [...new Set([...(person.skills || []), ...(mentor?.expertise || [])])];

  return (
    <>
      <button onClick={() => window.history.back()} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Back</button>

      {/* Header */}
      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-3">
            <Avatar name={person.name} className="h-20 w-20 border-4 border-white text-2xl" />
            {isSelf && <Link to="/profile"><Button variant="secondary" size="sm" icon={Pencil}>Edit profile</Button></Link>}
            {user.role === 'student' && investor && <Button size="sm" icon={Mic} onClick={() => setPitching(true)}>Request pitch meeting</Button>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{person.name}</h1>
            <Badge color={roleColor}>{roleLabel}</Badge>
          </div>
          {(person.headline || investor?.firmName) && (
            <p className="mt-1 text-slate-600">{person.headline || `${investor.firmName} · ${investor.investorType}`}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
            <a href={`mailto:${person.email}`} className="inline-flex items-center gap-1.5 hover:text-indigo-600"><Mail className="h-4 w-4" />{person.email}</a>
            {person.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" />{person.phone} <span className="text-xs text-slate-400">(only you & admins)</span></span>}
            {person.linkedin && <a href={person.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-indigo-600"><Link2 className="h-4 w-4" />LinkedIn</a>}
            {website && <a href={website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-indigo-600"><Globe className="h-4 w-4" />Website</a>}
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />Joined {fmtDate(person.joinedAt)}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats.length > 0 && (
        <div className={`mb-6 grid grid-cols-2 gap-4 ${stats.length > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase leading-snug tracking-wide text-slate-500">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-800" title={s.money ? inr(s.value) : undefined}>{s.money ? inrShort(s.value) : s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="About">
            {about ? <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{about}</p>
              : <p className="text-sm text-slate-400">{isSelf ? 'Add a short bio from your profile settings so others can get to know you.' : 'No bio added yet.'}</p>}
            {skills.length > 0 && <div className="mt-4"><p className="label">Skills & expertise</p><Chips items={skills} color="indigo" /></div>}
            {mentor?.availability && <p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><Clock className="h-4 w-4 text-slate-400" />Available: {mentor.availability}</p>}
            {investor && (
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {investor.firmName && <div><dt className="label">Firm</dt><dd className="text-sm text-slate-700">{investor.firmName}</dd></div>}
                <div><dt className="label">Investor type</dt><dd className="text-sm text-slate-700">{investor.investorType}</dd></div>
                {ticketRange(investor.ticketMin, investor.ticketMax) && <div><dt className="label">Ticket size</dt><dd className="text-sm text-slate-700">{ticketRange(investor.ticketMin, investor.ticketMax)}</dd></div>}
                {investor.focusIndustries.length > 0 && <div className="sm:col-span-2"><dt className="label">Focus industries</dt><dd><Chips items={investor.focusIndustries} color="purple" /></dd></div>}
              </dl>
            )}
          </Section>

          {data.startups && (
            <Section title="Startups founded" icon={Rocket} count={data.startups.length}>
              {data.startups.length === 0 ? <p className="text-sm text-slate-500">No verified startups yet.</p> : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{data.startups.map((s) => <StartupTile key={s.id} s={s} />)}</div>
              )}
            </Section>
          )}
          {data.memberOf?.length > 0 && (
            <Section title="Team member at" icon={Users} count={data.memberOf.length}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{data.memberOf.map((s) => <StartupTile key={s.id} s={s} extra={s.role} />)}</div>
            </Section>
          )}
          {data.mentorships && (
            <Section title="Mentorships" icon={Users} count={data.mentorships.length}>
              {data.mentorships.length === 0 ? <p className="text-sm text-slate-500">No mentorships yet.</p> : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {data.mentorships.map((s) => <StartupTile key={`${s.id}-${s.since}`} s={s} extra={s.status === 'removed' ? `mentored until reassignment` : `since ${fmtDate(s.since)}`} />)}
                </div>
              )}
            </Section>
          )}
          {data.portfolio && (
            <Section title="Investment portfolio" icon={Handshake} count={data.portfolio.length}>
              {data.portfolio.length === 0 ? <p className="text-sm text-slate-500">No closed investments yet.</p> : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {data.portfolio.map((p) => <StartupTile key={`${p.id}-${p.date}`} s={p} extra={`${inrShort(p.amount)} ${p.instrument}${p.equity ? ` · ${p.equity}%` : ''} · ${fmtDate(p.date)}`} />)}
                </div>
              )}
            </Section>
          )}
          {data.openOffers?.length > 0 && (
            <Section title="Open offers (visible only to you & admins)" icon={Briefcase} count={data.openOffers.length}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{data.openOffers.map((o) => <StartupTile key={o.id} s={o} extra={`${inrShort(o.amount)} ${o.instrument} · awaiting founder`} />)}</div>
            </Section>
          )}
        </div>

        <div className="space-y-6">
          <Section title="Achievements" icon={Trophy}>
            {achievements.length === 0 ? <EmptyState icon={Trophy} title="No achievements yet" text="Achievements appear automatically as work is completed on StartIn." /> : (
              <ul className="space-y-4">
                {achievements.map((a) => {
                  const Icon = ACHIEVEMENT_ICONS[a.icon] || Trophy;
                  return (
                    <li key={a.title} className="flex gap-3">
                      <div className="h-fit shrink-0 rounded-lg bg-amber-50 p-2 text-amber-600"><Icon className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                        {a.detail && <p className="text-xs text-slate-500">{a.detail}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
          {data.certificates && (
            <Section title="Workshops & certificates" icon={Award} count={data.certificates.length}>
              {data.certificates.length === 0 ? <p className="text-sm text-slate-500">No workshops attended yet.</p> : (
                <ul className="space-y-3">
                  {data.certificates.map((c) => (
                    <li key={c.id} className="flex items-start gap-2 text-sm">
                      <Award className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                      <div><p className="font-medium text-slate-800">{c.title}</p><p className="text-xs capitalize text-slate-500">{c.type} · {fmtDate(c.date)}</p></div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}
        </div>
      </div>
      {pitching && <PitchRequestModal investor={{ id: investor.id, name: person.name, firmName: investor.firmName }} onClose={() => setPitching(false)} onDone={() => setPitching(false)} />}
    </>
  );
}
