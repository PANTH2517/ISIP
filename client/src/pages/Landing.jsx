import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Rocket, Sprout, IndianRupee, UserCheck, Briefcase, GraduationCap, ArrowRight, MapPin,
  Landmark, ClipboardList, ChevronDown, Building2, Clock, CheckCircle2, Sparkles, Megaphone,
} from 'lucide-react';
import PublicLayout from '../components/portal/PublicLayout';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../config/brand';
import { fmtDate, fmtTime, inrShort } from '../utils/format';

const FEATURES = [
  { icon: ClipboardList, title: 'Idea to approval', text: 'Submit your startup with problem, solution, team and business model. Get it reviewed and approved fast.' },
  { icon: UserCheck, title: 'Mentors who show up', text: 'Get matched with domain mentors who review your milestones, give feedback and meet you regularly.' },
  { icon: Sprout, title: 'Milestone tracking', text: 'Clear milestones from idea validation to revenue, with progress your team and mentors can see.' },
  { icon: Briefcase, title: 'Investor connect', text: 'Pitch to angels and VCs, receive offers and schedule diligence meetings without leaving the app.' },
  { icon: IndianRupee, title: 'Verified deals', text: 'Every deal you accept is reviewed before it is final, so founders and investors are both protected.' },
  { icon: GraduationCap, title: 'Workshops & hackathons', text: 'Pitch clinics, hands-on workshops and hackathons, with certificates when you attend.' },
];

const STEPS = [
  { title: 'Register', text: 'Create your account and verify your email.' },
  { title: 'Submit your idea', text: 'Problem, solution, business model and team.' },
  { title: 'Get approved', text: 'Your application is reviewed and approved.' },
  { title: 'Build with a mentor', text: 'Hit milestones with guidance from idea to revenue.' },
  { title: 'Raise funding', text: 'Accept an investor offer; it is verified for you.' },
  { title: 'Get incubated', text: 'Join the incubation programme.' },
];

const STAKEHOLDERS = [
  { role: 'student', icon: Rocket, title: 'Founders', points: ['Register & submit startup ideas', 'Track milestones and funding', 'Pitch to investors'], cta: 'Register your startup' },
  { role: 'mentor', icon: UserCheck, title: 'Mentors', points: ['Guide assigned startups', 'Approve milestones & give feedback', 'Schedule mentoring sessions'], cta: 'Join as a mentor', to: '/register?role=mentor' },
  { role: 'investor', icon: Briefcase, title: 'Investors', points: ['Browse verified startups', 'Make offers & review pitch decks', 'Hold diligence meetings'], cta: 'Join as an investor', to: '/register?role=investor' },
  { role: 'admin', icon: Building2, title: 'Program team', points: ['Approve startups & assign mentors', 'Clear, hold or cancel funding deals', 'Reports & analytics'], cta: 'Administrator login', to: '/login' },
];

const FAQS = [
  ['Who can apply?', 'Any student founder can submit a startup idea, alone or with a team. Mentors and investors can sign up too.'],
  ['When does a startup become "incubated"?', 'Once your startup is approved, it is incubated as soon as it secures finance: an investor offer that you accept and that passes our review.'],
  ['How are mentors assigned?', 'We match mentors to your industry and needs. You can request meetings with your mentor, and they can schedule sessions with you.'],
  ['Can I pitch to investors directly?', 'Yes. Once your startup is approved, open the Investors directory, choose an investor and send a pitch request with your funding ask and deck.'],
  ['Who decides on funding?', 'Funding is agreed between you and the investor. We never grant money ourselves; we review each accepted deal and clear it, put it on hold until something is fixed, or cancel it.'],
  ['Is my data safe?', 'Access is role-based, sensitive fields such as phone numbers are encrypted, and every change is recorded in an audit log. Drafts and pending applications are never public.'],
];

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className="text-sm font-semibold text-indigo-600">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-lg text-slate-500">{text}</p>}
    </div>
  );
}

export default function Landing() {
  const { data } = useApi('/public/overview');
  const { user } = useAuth();
  const { hash } = useLocation();
  useEffect(() => { document.title = `${BRAND.name} · ${BRAND.fullName}`; }, []);
  // Menu links point at /#section; scroll there (also once data has rendered and moved the layout).
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [hash, data]);
  const s = data?.stats;

  const STATS = [
    { label: 'Startups', value: s?.startups },
    { label: 'Incubated', value: s?.incubated },
    { label: 'Mentors', value: s?.mentors },
    { label: 'Investors', value: s?.investors },
    { label: 'Funding raised', value: s ? inrShort(s.financeCommitted) : undefined },
    { label: 'Workshops held', value: s?.workshopsHeld },
  ];

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-white">
        <div className="absolute -top-40 left-1/2 h-[32rem] w-[64rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/50 via-accent-200/40 to-sky-200/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-16 pt-16 lg:grid-cols-2 lg:px-8 lg:pb-24 lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />Applications open all year
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
              From campus idea to <span className="bg-gradient-to-r from-indigo-600 to-accent-600 bg-clip-text text-transparent">incubated startup</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              {BRAND.name} brings your application, mentors, milestones and investors into one place, so you can spend your time building, not chasing emails and spreadsheets.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700">Go to my dashboard <ArrowRight className="h-4 w-4" /></Link>
              ) : <>
                <Link to="/register" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700">Register your startup <ArrowRight className="h-4 w-4" /></Link>
                <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50">Log in</Link>
              </>}
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              {['Free for student founders', 'Mentors & investors on board', 'Verified funding deals'].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{t}</li>
              ))}
            </ul>
          </div>

          {/* Journey card */}
          <div id="how-it-works" className="relative scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-indigo-100/60">
              <p className="text-sm font-semibold text-slate-900">Your startup journey</p>
              <ol className="mt-5 space-y-1">
                {STEPS.map((st, i) => (
                  <li key={st.title} className="flex items-center gap-4 rounded-xl px-2 py-2.5 hover:bg-slate-50">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i === STEPS.length - 1 ? 'bg-emerald-500 text-white' : 'bg-indigo-50 text-indigo-700'}`}>{i + 1}</span>
                    <div>
                      <p className="font-semibold text-slate-900">{st.title}</p>
                      <p className="text-sm text-slate-500">{st.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-100 bg-white px-4 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 py-10 md:grid-cols-3 lg:grid-cols-6">
          {STATS.map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="font-display text-3xl font-bold text-slate-900">{value ?? '—'}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 px-4 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Features" title="Everything a student startup needs" text="One platform for every stage, from the first idea to your first investment." />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-accent-500 text-white shadow-sm"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Startup showcase */}
      <section id="startups" className="scroll-mt-20 bg-slate-50 px-4 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Portfolio" title="Startups building with us" text="Approved student startups currently being mentored and incubated." />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.showcase || []).map((st) => (
              <div key={st.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-accent-500 font-display text-xl font-bold text-white">{st.startupName[0]}</div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.status === 'incubated' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>{st.status === 'incubated' ? 'Incubated' : 'Approved'}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{st.startupName}</h3>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{st.industry}</p>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-500">{st.description}</p>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Milestone progress</span><span className="font-semibold text-slate-700">{st.progress}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${st.progress}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events + updates */}
      <section id="events" className="scroll-mt-20 px-4 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="What's on" title="Events & updates" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-3">
              <div className="border-b border-slate-100 px-6 py-4"><h3 className="font-semibold text-slate-900">Upcoming events</h3></div>
              {!data ? <p className="p-6 text-sm text-slate-500">Loading…</p> : data.upcomingEvents.length === 0 ? <p className="p-6 text-sm text-slate-500">New workshops and hackathons will be announced here.</p> : (
                <ul className="divide-y divide-slate-100">
                  {data.upcomingEvents.map((e) => (
                    <li key={e.id} className="flex gap-4 px-6 py-4">
                      <div className="w-14 shrink-0 rounded-xl bg-indigo-50 py-2 text-center">
                        <p className="text-[11px] font-semibold uppercase text-indigo-600">{new Date(`${e.date}T00:00`).toLocaleDateString('en-IN', { month: 'short' })}</p>
                        <p className="font-display text-xl font-bold text-indigo-700">{new Date(`${e.date}T00:00`).getDate()}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{e.title}</p>
                        <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                          <span className="capitalize">{e.type}</span>
                          {e.time && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtTime(e.time)}</span>}
                          {e.venue && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.venue}</span>}
                        </p>
                        {e.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{e.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {(!user || user.role === 'student' || user.role === 'admin') && (
                <div className="border-t border-slate-100 px-6 py-3 text-sm">
                  <Link to={user ? '/workshops' : '/login'} className="font-semibold text-indigo-600 hover:underline">{user ? 'View all events →' : 'Log in to register for events →'}</Link>
                </div>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4"><Megaphone className="h-4 w-4 text-indigo-600" /><h3 className="font-semibold text-slate-900">Latest updates</h3></div>
              <ul className="divide-y divide-slate-100">
                {(data?.notices || []).map((n, i) => (
                  <li key={i} className="px-6 py-3.5 text-sm">
                    <p className="text-slate-700">{n.text} {n.isNew && <span className="ml-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-700">New</span>}</p>
                    {n.date && <p className="mt-0.5 text-xs text-slate-400">{fmtDate(n.date)}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stakeholders */}
      <section className="bg-slate-50 px-4 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Who it's for" title="Built for everyone in the ecosystem" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STAKEHOLDERS.map(({ role, icon: Icon, title, points, cta, to }) => {
              const mine = user?.role === role;
              return (
                <div key={title} className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${mine ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
                  {mine && <span className="absolute -top-3 right-4 whitespace-nowrap rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">Your role</span>}
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Icon className="h-5 w-5" /></div>
                    <h3 className="font-semibold text-slate-900">{title}</h3>
                  </div>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                    {points.map((p) => <li key={p} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{p}</li>)}
                  </ul>
                  {/* Signed in: only your own role gets a button. Signed out: each card leads to its sign-up / login. */}
                  {(!user || mine) && (
                    <Link to={mine ? '/dashboard' : to || '/register'} className={`mt-5 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${mine ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                      {mine ? 'Open my dashboard' : cta}<ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 px-4 py-24 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <SectionTitle eyebrow="FAQ" title="Frequently asked questions" />
          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {FAQS.map(([q, a]) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold text-slate-900">
                  {q}<ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <p className="px-6 pb-5 text-sm leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 lg:px-8">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-accent-600 px-6 py-14 text-center shadow-xl">
          <div className="hero-pattern absolute inset-0" />
          <div className="relative">
            <Landmark className="mx-auto h-8 w-8 text-indigo-100" />
            <p className="mt-4 font-display text-3xl font-bold text-white">Have an idea worth building?</p>
            <p className="mt-2 text-indigo-100">Join {s?.students ?? 'other'} student founders already on {BRAND.name}.</p>
            <Link to={user ? '/dashboard' : '/register'} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-indigo-700 shadow hover:bg-indigo-50">{user ? 'Go to my dashboard' : 'Start your application'} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
