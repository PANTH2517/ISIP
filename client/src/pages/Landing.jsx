import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Rocket, Sprout, IndianRupee, UserCheck, Briefcase, GraduationCap, ArrowRight, CalendarDays, MapPin, ShieldCheck,
  FileCheck2, Target, Landmark, UserPlus, ClipboardList, ChevronDown, Users, BadgeCheck, Building2, Clock,
} from 'lucide-react';
import PublicLayout from '../components/portal/PublicLayout';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../config/brand';
import { fmtDate, fmtTime, inrShort } from '../utils/format';

const PROGRAMMES = [
  { icon: ClipboardList, title: 'Pre-incubation', text: 'Submit your idea, get it verified by the Incubation Cell and start building with structured milestones.' },
  { icon: Sprout, title: 'Incubation programme', text: 'Startups that secure finance are admitted to full incubation with workspace, mentoring and reviews.' },
  { icon: IndianRupee, title: 'Seed funding', text: 'Apply for incubation funding with your business plan; track approvals and disbursal in one place.' },
  { icon: UserCheck, title: 'Mentor network', text: 'Get matched with domain mentors who review milestones, give feedback and meet you regularly.' },
  { icon: Briefcase, title: 'Investor connect', text: 'Pitch to angel networks and VCs, receive offers and schedule diligence meetings from the portal.' },
  { icon: GraduationCap, title: 'Workshops & hackathons', text: 'Hands-on training, pitch clinics and hackathons with participation certificates.' },
];

const STEPS = [
  { icon: UserPlus, title: 'Register', text: 'Create your account and verify your email.' },
  { icon: FileCheck2, title: 'Submit your idea', text: 'Problem, solution, business model and team.' },
  { icon: ShieldCheck, title: 'Verification', text: 'The Incubation Cell reviews and approves.' },
  { icon: Target, title: 'Mentoring & milestones', text: 'A mentor guides you from idea to revenue.' },
  { icon: Landmark, title: 'Secure finance', text: 'Seed funding or an accepted investor offer.' },
  { icon: Sprout, title: 'Incubated', text: 'Admitted to the incubation programme.' },
];

const STAKEHOLDERS = [
  { icon: Rocket, title: 'Student entrepreneurs', points: ['Register & submit startup ideas', 'Track milestones and funding', 'Pitch to investors'], cta: 'Register your startup' },
  { icon: UserCheck, title: 'Mentors', points: ['Guide assigned startups', 'Approve milestones & give feedback', 'Schedule mentoring sessions'], cta: 'Join as a mentor' },
  { icon: Briefcase, title: 'Investors', points: ['Browse verified startups', 'Make offers & review pitch decks', 'Hold diligence meetings'], cta: 'Join as an investor' },
  { icon: Building2, title: 'Incubation Cell', points: ['Verify startups & assign mentors', 'Approve funding requests', 'Reports & analytics'], cta: 'Administrator login', to: '/login' },
];

const FAQS = [
  ['Who can apply?', 'Any registered student of the institute can submit a startup idea, individually or with a team. Mentors and investors can register too.'],
  ['When does a startup become "incubated"?', 'After verification your startup is approved. It is admitted to incubation once it secures finance, either an approved seed-funding request or an investor offer that you accept.'],
  ['How are mentors assigned?', 'The Incubation Cell assigns mentors based on your industry and needs. You can request meetings with your mentor, and they can schedule sessions with you.'],
  ['Can I pitch to investors directly?', 'Yes. Once your startup is approved, open the Investors directory, choose an investor and send a pitch request with your funding ask and pitch deck.'],
  ['Is my data safe?', 'Access is role-based, sensitive fields such as phone numbers are encrypted, and every change is recorded in an audit log. Drafts and pending applications are never shown publicly.'],
];

function SectionTitle({ eyebrow, title, text, light = false }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${light ? 'text-saffron-300' : 'text-saffron-600'}`}>{eyebrow}</p>
      <h2 className={`mt-2 font-display text-3xl font-bold tracking-tight ${light ? 'text-white' : 'text-indigo-950'}`}>{title}</h2>
      <div className="mx-auto mt-3 flex w-24 overflow-hidden rounded-full"><span className="h-1 flex-1 bg-[#ff9933]" /><span className="h-1 flex-1 bg-slate-200" /><span className="h-1 flex-1 bg-[#138808]" /></div>
      {text && <p className={`mt-4 ${light ? 'text-indigo-100' : 'text-slate-600'}`}>{text}</p>}
    </div>
  );
}

export default function Landing() {
  const { data } = useApi('/public/overview');
  const { user } = useAuth();
  useEffect(() => { document.title = `${BRAND.name} · ${BRAND.fullName}`; }, []);
  const s = data?.stats;

  const STATS = [
    { label: 'Startups supported', value: s?.startups, icon: Rocket },
    { label: 'Incubated startups', value: s?.incubated, icon: Sprout },
    { label: 'Expert mentors', value: s?.mentors, icon: UserCheck },
    { label: 'Investors on board', value: s?.investors, icon: Briefcase },
    { label: 'Finance committed', value: s ? inrShort(s.financeCommitted) : undefined, icon: Landmark },
    { label: 'Workshops held', value: s?.workshopsHeld, icon: GraduationCap },
  ];

  return (
    <PublicLayout notices={data?.notices}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-700">
        <div className="hero-pattern absolute inset-0" />
        <div className="absolute -right-24 top-10 h-96 w-96 rounded-full bg-saffron-500/20 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-24 pt-14 lg:grid-cols-2 lg:px-8 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-saffron-200">
              <BadgeCheck className="h-4 w-4" />Applications open all year · {BRAND.cell}
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              From campus idea to <span className="text-saffron-400">incubated startup</span>, in one portal.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-indigo-100">
              {BRAND.name} brings idea submission, verification, mentorship, milestones, seed funding and investor connect together, replacing scattered forms, emails and spreadsheets.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-md bg-saffron-500 px-6 py-3 font-semibold text-white shadow-lg hover:bg-saffron-600">Go to my dashboard <ArrowRight className="h-4 w-4" /></Link>
              ) : <>
                <Link to="/register" className="inline-flex items-center gap-2 rounded-md bg-saffron-500 px-6 py-3 font-semibold text-white shadow-lg hover:bg-saffron-600">Register your startup <ArrowRight className="h-4 w-4" /></Link>
                <Link to="/login" className="inline-flex items-center gap-2 rounded-md border-2 border-white/70 px-6 py-3 font-semibold text-white hover:bg-white/10">Portal login</Link>
              </>}
            </div>
          </div>
          {/* Journey card */}
          <div className="relative hidden lg:block">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-wider text-saffron-200">Your startup journey</p>
              <ol className="mt-5 space-y-4">
                {STEPS.map((st, i) => (
                  <li key={st.title} className="flex items-center gap-4">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i === STEPS.length - 1 ? 'bg-[#138808] text-white' : 'bg-white text-indigo-900'}`}>{i + 1}</span>
                    <div className="flex-1 border-b border-white/10 pb-3">
                      <p className="font-semibold text-white">{st.title}</p>
                      <p className="text-sm text-indigo-200">{st.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="relative z-10 -mt-14 px-4 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl md:grid-cols-3 lg:grid-cols-6">
          {STATS.map(({ label, value, icon: Icon }, i) => (
            <div key={label} className={`flex flex-col items-center gap-1 px-4 py-6 text-center ${i ? 'border-l border-slate-100' : ''}`}>
              <Icon className="h-6 w-6 text-saffron-500" />
              <p className="font-display text-3xl font-bold text-indigo-900">{value ?? '—'}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Programmes */}
      <section id="programmes" className="scroll-mt-4 px-4 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Programmes & services" title="Everything a student startup needs" text="One portal for every stage of the incubation lifecycle, from the first idea to investment." />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROGRAMMES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="group rounded-xl border border-slate-200 border-t-4 border-t-indigo-800 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-800 transition group-hover:bg-saffron-500 group-hover:text-white"><Icon className="h-6 w-6" /></div>
                <h3 className="mt-4 text-lg font-semibold text-indigo-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-4 bg-indigo-950 px-4 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle light eyebrow="How it works" title="Six steps to incubation" text="A transparent, trackable process. You always know where your application stands." />
          <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-xl bg-white/5 p-5 text-center ring-1 ring-white/10">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-saffron-500 px-2.5 py-0.5 text-xs font-bold text-white">Step {i + 1}</span>
                <Icon className="mx-auto mt-3 h-8 w-8 text-saffron-300" />
                <p className="mt-3 font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm text-indigo-200">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Events + notices */}
      <section id="events" className="scroll-mt-4 px-4 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Stay informed" title="Events & notice board" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-3">
              <div className="flex items-center gap-2 bg-indigo-900 px-5 py-3 text-white"><CalendarDays className="h-5 w-5 text-saffron-300" /><h3 className="font-semibold">Upcoming events</h3></div>
              {!data ? <p className="p-5 text-sm text-slate-500">Loading…</p> : data.upcomingEvents.length === 0 ? <p className="p-5 text-sm text-slate-500">New workshops and hackathons will be announced here.</p> : (
                <ul className="divide-y divide-slate-100">
                  {data.upcomingEvents.map((e) => (
                    <li key={e.id} className="flex gap-4 px-5 py-4">
                      <div className="w-16 shrink-0 overflow-hidden rounded-md border border-indigo-100 text-center">
                        <p className="bg-saffron-500 py-0.5 text-[11px] font-bold uppercase text-white">{new Date(`${e.date}T00:00`).toLocaleDateString('en-IN', { month: 'short' })}</p>
                        <p className="py-1 font-display text-2xl font-bold text-indigo-900">{new Date(`${e.date}T00:00`).getDate()}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-indigo-950">{e.title}</p>
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
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-sm"><Link to="/login" className="font-semibold text-indigo-800 hover:underline">Log in to register for events →</Link></div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 bg-saffron-500 px-5 py-3 text-white"><ClipboardList className="h-5 w-5" /><h3 className="font-semibold">Notice board</h3></div>
              <ul className="divide-y divide-slate-100">
                {(data?.notices || []).map((n, i) => (
                  <li key={i} className="flex gap-3 px-5 py-3.5 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-700" />
                    <div>
                      <p className="text-slate-800">{n.text} {n.isNew && <span className="ml-1 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">New</span>}</p>
                      {n.date && <p className="mt-0.5 text-xs text-slate-500">{fmtDate(n.date)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Startup showcase */}
      <section id="startups" className="scroll-mt-4 bg-slate-50 px-4 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Our portfolio" title="Startups in the programme" text="Verified student startups currently being mentored and incubated." />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.showcase || []).map((st) => (
              <div key={st.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-900 font-display text-xl font-bold text-white">{st.startupName[0]}</div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.status === 'incubated' ? 'bg-[#138808]/10 text-[#0f6e06]' : 'bg-indigo-50 text-indigo-800'}`}>{st.status === 'incubated' ? 'Incubated' : 'Approved'}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-indigo-950">{st.startupName}</h3>
                <p className="text-xs font-semibold uppercase tracking-wide text-saffron-600">{st.industry}</p>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600">{st.description}</p>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Milestone progress</span><span className="font-semibold text-slate-700">{st.progress}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-700" style={{ width: `${st.progress}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stakeholders */}
      <section className="px-4 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Get started" title="One portal for every stakeholder" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STAKEHOLDERS.map(({ icon: Icon, title, points, cta, to }) => (
              <div key={title} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-saffron-50 p-2.5 text-saffron-600"><Icon className="h-6 w-6" /></div>
                  <h3 className="font-semibold text-indigo-950">{title}</h3>
                </div>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                  {points.map((p) => <li key={p} className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#138808]" />{p}</li>)}
                </ul>
                <Link to={user ? '/dashboard' : to || '/register'} className="mt-5 inline-flex items-center justify-center gap-2 rounded-md border-2 border-indigo-800 px-4 py-2 text-sm font-semibold text-indigo-900 hover:bg-indigo-800 hover:text-white">
                  {user ? 'Open dashboard' : cta}<ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-4 bg-slate-50 px-4 py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <SectionTitle eyebrow="Help" title="Frequently asked questions" />
          <div className="space-y-3">
            {FAQS.map(([q, a]) => (
              <details key={q} className="group rounded-lg border border-slate-200 bg-white shadow-sm open:border-indigo-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-indigo-950">
                  {q}<ChevronDown className="h-5 w-5 shrink-0 text-saffron-600 transition group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center gap-3 rounded-xl bg-indigo-900 px-6 py-8 text-center">
            <Users className="h-8 w-8 text-saffron-300" />
            <p className="font-display text-xl font-bold text-white">Have an idea worth building?</p>
            <p className="text-sm text-indigo-200">Join {s?.students ?? 'our'} student founders already on {BRAND.name}.</p>
            <Link to={user ? '/dashboard' : '/register'} className="mt-2 inline-flex items-center gap-2 rounded-md bg-saffron-500 px-6 py-2.5 font-semibold text-white hover:bg-saffron-600">{user ? 'Go to my dashboard' : 'Start your application'} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
