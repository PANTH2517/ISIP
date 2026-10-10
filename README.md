# StartIn — Intelligent Startup Incubation Platform (ISIP)

A startup incubation platform for student founders, mentors, investors and program managers. Startup applications, mentor assignment, milestone tracking, investor funding (reviewed by the program team), meetings, workshops, documents, notifications and reports all live in one place, replacing Google Forms, emails and spreadsheets.

**Stack:** React + Tailwind CSS + Chart.js · Node.js + Express · PostgreSQL (or SQLite locally) via Sequelize · JWT auth

---

## Quick start

Requires Node.js 20+.

```bash
npm run install:all      # installs root, server and client dependencies
cp server/.env.example server/.env   # then set JWT_SECRET and ENCRYPTION_KEY
npm run dev              # API on :5000, web app on http://localhost:5173
```

On first start the server creates a local SQLite database (`server/data/isip.sqlite`) and loads demo data. You don't need to install a database to develop locally.

| Command | What it does |
|---|---|
| `npm run dev` | Run API + web app together |
| `npm run seed` | Wipe the database and reload demo data |
| `npm test` | Run all tests: API integration tests (35, `npm run test:server`) and frontend tests (56, `npm run test:client`) |
| `npm run backup` | Export every table to `server/backups/*.json` |
| `npm run build && npm start` | Production build; the API also serves the built React app |

### Demo accounts (development only)

| Role | Email | Password |
|---|---|---|
| Incubation Manager (Admin) | `admin@isip.edu` | `Admin@123` |
| Mentor | `priya.mentor@isip.edu` (also `rahul.mentor@`, `anita.mentor@`) | `Password@123` |
| Student Entrepreneur | `aarav.student@isip.edu` (also `riya.student@`, `kabir.student@`, `meera.student@`) | `Password@123` |
| Investor | `vikram.investor@isip.edu` (also `neha.investor@`) | `Password@123` |

The login page has one-click buttons that fill these in during development.

**Emails:** if `SMTP_HOST` isn't set, emails (verification, password reset, notifications) are printed to the server console. The UI also shows the verification/reset link directly in development mode.

---

## Portal design

The frontend uses a civic, institutional **portal** style: navy and orange theme, masthead with the StartIn
emblem, a navigation bar, breadcrumbs, text-size controls (A- / A / A+, remembered per browser) and an
institutional footer. It is not tied to any country or government: no flags, national emblems or official names.

- **Public home page** (`/`): live statistics, programmes, the six-step incubation journey, upcoming events and
  updates, a showcase of approved/incubated startups and FAQs. Data comes from the unauthenticated
  `GET /api/public/overview` endpoint, which returns aggregates only (no emails, phones or drafts) and is cached
  for 60s.
- **Branding:** set `VITE_INSTITUTE_NAME` and `VITE_HELPDESK_EMAIL` in `client/.env` (see `client/.env.example`).

---

## Features by module

| # | Module | What's implemented |
|---|---|---|
| 1 | **User Authentication** | Register (Student / Mentor / Investor), email verification, login, logout, forgot/reset password, change password, JWT sessions, role-based access |
| 2 | **Startup Registration** | Create / edit / delete startups with name, industry, description, team members, tech stack, problem, solution and business model. Lifecycle: Draft → **Pending → Approved → Incubated** (or Rejected with remarks and resubmit). A startup becomes **Incubated only once it secures finance** (see below) |
| 3 | **Mentor Management** | Admin assigns/removes mentors; mentors accept assignments; mentor dashboard shows assigned startups, meetings, pending reviews and completed milestones |
| 4 | **Milestone Tracking** | Approval auto-creates Idea Validation → Prototype → MVP → Customer Testing → Revenue → Funding. Students submit updates, mentors approve or return them, and the **progress bar recalculates automatically**. Mentors can add custom milestones |
| 5 | **Funding Transactions** | Funding happens **only between founders and investors**. When a founder accepts an investor offer it becomes a transaction, and the admin (program team) can only **clear** it, put it **on hold** (with a reason) or **cancel** it (with a reason). Founders and investors see the status and the reason; only cleared deals count as finance. Admin **Transactions** page with filters |
| 6 | **Meeting Scheduler** | Students request meetings with assigned mentors; mentors **accept / reject / reschedule** or **schedule meetings directly**. Every meeting can carry a venue or video link; meetings can be completed or cancelled; history stored. **Automatic lifecycle:** both sides check in from 15 min before the start. An unconfirmed request **expires**, and a confirmed meeting nobody checks in to is marked **missed** (auto-cancelled), 10 min after the start. Checked-in meetings auto-complete after an hour. Both people are notified. The same rules apply to investor meetings |
| 7 | **Document Repository** | Upload PDF, PPT, pitch decks, business plans, prototype images; re-uploading under the same title creates a new **version** with full version history |
| 8 | **Workshop Management** | Admin creates workshops, hackathons and training sessions (with capacity); students register; admin marks attendance; **PDF certificates** are generated for attendees |
| 9 | **Notifications** | Dashboard bell + notifications page + email for milestone approvals, meetings, offers and transaction clearances, workshops and assignments; admin announcements |
| 10 | **Reports** | Startup count, finance cleared vs awaiting clearance, active mentors, industry-wise startups, monthly registrations, workshop stats. Charts, saved reports, **PDF export** (paginated, branded tables) and **CSV export** |
| 11 | **Investor Module** | Investors register (Angel / VC / Corporate…), browse approved & incubated startups, view a read-only profile (overview, team, milestones, pitch documents), **make investment offers** (amount, equity %, instrument) and **request meetings** (intro, due diligence, follow-up). Founders browse an **Investors directory** and send **pitch requests** with their funding ask and pitch deck. Whoever receives a request or a new proposed time confirms it. Founders accept/decline offers and accept/decline/reschedule meetings. Investor dashboard with focus-industry recommendations; admin Investors page with all offers and deals |

**Dashboards:** separate Student, Mentor, Investor and Admin dashboards.

**People profiles:** click any person's name (founders, mentors, investors, team members, admins) to open their profile.

- Each profile shows their headline, bio, skills and LinkedIn / website, plus a report of their work:
  - **Founders:** startups, finance raised, milestones, certificates.
  - **Mentors:** mentorships, feedback given, meetings held.
  - **Investors:** portfolio and amount committed.
- Achievements are earned automatically from activity on the platform.
- Private data stays private: phone numbers, unverified startups and pending offers are shown only to the person themself and to admins.
- Edit your own profile from **My Profile → View public profile**.

### Incubation rule: a startup is incubated only when it gets finance

```
Draft → Pending → Approved ──(secures finance)──► Incubated
```

*Finance* means an **investor deal that the founder accepted and the admin cleared**. The platform never grants money itself.

```
Investor offer ──(founder accepts)──► Under review ──(admin clears)──► Cleared = finance
                                          │  ▲
                              (admin holds)  │ (admin clears)
                                          ▼  │
                                        On hold ──(admin cancels)──► Cancelled
```

- When the admin clears a transaction, an approved startup moves to **Incubated automatically**. The founder, investor, mentors and admins are notified.
- Holding or cancelling needs a reason, which both the founder and the investor see. Cleared and cancelled transactions are final.
- The admin's manual "Mark as incubated" button stays disabled, and the API refuses the change, until the startup has finance.
- Approved startups show an "Awaiting finance" banner; the admin dashboard lists every startup still waiting.
- Each startup shows a **Finance secured** card (cleared deals, plus the amount still awaiting clearance).

### Non-functional requirements

| NFR | How it's met |
|---|---|
| Secure authentication | bcrypt password hashing, JWT, rate-limited auth endpoints, Helmet security headers |
| Role-based access | `authorize()` middleware plus per-startup ownership/assignment checks (`services/access.js`) |
| Data encryption | Phone numbers encrypted at rest with AES-256-GCM (`utils/crypto.js`) |
| Audit logging | Every state-changing request is logged; viewable at **Admin → Audit Log** |
| Backup support | `npm run backup` exports all tables to JSON |
| Responsive & accessible UI | Tailwind responsive layout with a collapsible mobile sidebar; text-size controls, skip link, breadcrumbs |
| Scalable architecture | Stateless REST API, separate frontend and backend; PostgreSQL in production |

---

## Project structure

```
ISIP/
├── server/                 Express API
│   ├── src/
│   │   ├── models/index.js     All tables + associations (mirrors the class diagram)
│   │   ├── routes/             auth, startups, documents, milestones, mentors, meetings,
│   │   │                       feedback, workshops, notifications, users, reports, dashboard, investors, people
│   │   ├── middleware/         auth (JWT + RBAC), audit logger, file upload
│   │   ├── services/           access control + finance/incubation rule, notifications, mailer, statistics
│   │   ├── seed.js             Demo data
│   │   └── backup.js           JSON backup
│   └── tests/api.test.js   API integration tests (node:test + supertest)
└── client/                 React app (Vite)
    └── src/                Frontend tests live next to the code as *.test.js(x) (Vitest + Testing Library)
        ├── pages/              auth, dashboards, startups (+ tabs), meetings, funding,
        │                       workshops, notifications, profile, people profiles, investor/*, admin/*
        └── components/         Layout, UI kit, TransactionsPanel, MeetingsPanel, InvestorMeetings, InvestorActions
```

## Database (20 tables)

`Roles`, `Users`, `Startups`, `StartupMembers`, `Mentors`, `MentorAssignments`, `Milestones`, `MilestoneUpdates`, `MeetingRequests`, `Meetings`, `Documents`, `Workshops`, `WorkshopRegistrations`, `Notifications`, `Feedback`, `Reports`, `AuditLogs`, `Investors`, `InvestmentInterests`, `InvestorMeetings`

These map one-to-one to the Experiment 5 class diagram, plus `Reports` and `AuditLogs` from the SRS and the three investor-module tables (the brief's *Investors* and *InvestorRequests*). Key relationships: User *creates* Startup (1:\*), Startup *has* Members / Milestones / Documents (1:\*), Milestone *has* MilestoneUpdates (1:\*), Mentor ↔ Startup through MentorAssignment, MeetingRequest *results in* Meeting (1:0..1), Workshop *has* WorkshopRegistrations, Mentor *provides* Feedback.

## Use cases → where to find them

| Use case (Exp 4) | Actor(s) | Screen |
|---|---|---|
| Register / Login | All | `/register`, `/login` |
| Manage Startup Profile · Submit Startup Idea | Student | My Startups → New / Edit / Submit |
| Manage Documents | Student, Mentor, Investor (read-only), Admin | Startup → Documents tab |
| View Startup · Review Startup | All / Mentor | Startup detail page |
| Manage Meetings | Student, Mentor, Admin | Meetings |
| Track Milestones | Student, Mentor, Admin | Startup → Milestones tab |
| Provide Feedback / Suggestions | Mentor | Startup → Mentor feedback tab |
| Manage Funding | Student, Investor, Admin | Investors tab (accept offers) · Transactions (clear / hold / cancel) |
| Manage Workshops & Events | Student, Admin | Workshops & Events |
| Manage Users | Admin | Users |
| Assign Mentors · Verify Startup | Admin | Mentors; Startup → Approve / Reject / Assign mentor |
| Generate Reports | Admin | Reports |
| Manage Notifications | All | Bell icon, Notifications (admin: announcements) |
| Browse Startups · View Startup Profile | Investor | Browse Startups → startup page |
| Show Investment Interest · Request Meeting | Investor | Startup page → Make an offer / Request meeting; My Offers; Meetings |
| Respond to Investors | Student | Startup → Investors tab |

---

## Deployment (Supabase + Render + Vercel)

The database is PostgreSQL on **Supabase**, the API runs on **Render** ([`render.yaml`](render.yaml)) and the React
frontend on **Vercel** (`client/`, with `client/vercel.json` rewriting routes to `index.html`). All three have
free plans.

1. **Supabase:** create a project (note the database password), then **Connect → Connection string → Session
   pooler** and copy it (`postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`).
   Use the pooler string: the *Direct connection* host is IPv6-only and Render can't reach it.
2. **Render:** **New → Blueprint**, connect this repository and choose the branch. Fill in:
   - `DATABASE_URL`: the Supabase Session pooler connection string.
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD`: your administrator login (password 10+ characters).
   - `DEMO_PASSWORD`: password for all demo accounts (`SEED_DEMO=true` loads demo data on first start). Leave it
     empty to start with an empty platform.
   - `CLIENT_URL`: leave a placeholder for now; set it to the Vercel address after step 3.
   `JWT_SECRET` and `ENCRYPTION_KEY` are generated automatically; the server refuses to start without them.
   Check `https://<service>.onrender.com/api/health` once it is live.
3. **Vercel:** **Add New → Project**, import this repository, set **Root Directory** to `client` (framework: Vite)
   and add the environment variable `VITE_API_URL=https://<service>.onrender.com/api`. Deploy.
4. Back in Render, set `CLIENT_URL` to the Vercel address (e.g. `https://startin.vercel.app`; several addresses can
   be comma-separated) and save; the API restarts with CORS allowing your site.

Notes:
- **Email:** without `SMTP_*` settings, new accounts are verified automatically and password-reset emails are only
  written to the log (reset links are never shown in the browser). Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASS` and `MAIL_FROM` to turn on real email.
- **Uploads:** documents are stored on the API's disk, which is temporary on Render's free plan (cleared on every
  deploy or restart). Use a persistent disk or move storage to Cloudinary/S3 before relying on uploads.
- **Free plan sleep:** the API sleeps after 15 minutes without traffic; the first request then takes about a minute.

## Future scope

AI idea evaluator, AI mentor recommendation, startup score prediction, AI investor matching, chat, video meetings, Power BI analytics, mobile app.
