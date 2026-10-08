# StartIn — Intelligent Startup Incubation Platform (ISIP)

A web platform that digitises a college incubation cell (E-Cell / Incubation Center). Startup applications, mentor assignment, milestone tracking, funding requests, meetings, workshops, documents, notifications and reports all live in one place, replacing Google Forms, emails and spreadsheets.

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

The frontend follows a civic **e-governance portal** style: accessibility bar (skip link, A- / A / A+ text size,
remembered per browser), navy/saffron/green theme, breadcrumbs and an
institutional footer. The design is deliberately generic: it uses no official emblems or government names.

- **Public home page** (`/`): live statistics, programmes, the six-step incubation journey, upcoming events and a
  notice board, a showcase of approved/incubated startups and FAQs. Data comes from the unauthenticated
  `GET /api/public/overview` endpoint, which returns aggregates only (no emails, phones or drafts) and is cached for 60s.
- **Branding:** set `VITE_INSTITUTE_NAME` and `VITE_HELPDESK_EMAIL` in `client/.env` (see `client/.env.example`).

---

## Features by module

| # | Module | What's implemented |
|---|---|---|
| 1 | **User Authentication** | Register (Student / Mentor / Investor), email verification, login, logout, forgot/reset password, change password, JWT sessions, role-based access |
| 2 | **Startup Registration** | Create / edit / delete startups with name, industry, description, team members, tech stack, problem, solution and business model. Lifecycle: Draft → **Pending → Approved → Incubated** (or Rejected with remarks and resubmit). A startup becomes **Incubated only once it secures finance** (see below) |
| 3 | **Mentor Management** | Admin assigns/removes mentors; mentors accept assignments; mentor dashboard shows assigned startups, meetings, pending reviews and completed milestones |
| 4 | **Milestone Tracking** | Approval auto-creates Idea Validation → Prototype → MVP → Customer Testing → Revenue → Funding. Students submit updates, mentors approve or return them, and the **progress bar recalculates automatically**. Mentors can add custom milestones |
| 5 | **Funding Requests** | Purpose, amount, business plan and supporting document. Admin can **approve** (full or partial), **reject** or **request modification**; students resubmit. Full funding history |
| 6 | **Meeting Scheduler** | Students request meetings with assigned mentors; mentors **accept / reject / reschedule** or **schedule meetings directly**. Every meeting can carry a venue or video link; meetings can be completed or cancelled; history stored. **Automatic lifecycle:** both sides check in from 15 min before the start. An unconfirmed request **expires**, and a confirmed meeting nobody checks in to is marked **missed** (auto-cancelled), 10 min after the start. Checked-in meetings auto-complete after an hour. Both people are notified. The same rules apply to investor meetings |
| 7 | **Document Repository** | Upload PDF, PPT, pitch decks, business plans, prototype images; re-uploading under the same title creates a new **version** with full version history |
| 8 | **Workshop Management** | Admin creates workshops, hackathons and training sessions (with capacity); students register; admin marks attendance; **PDF certificates** are generated for attendees |
| 9 | **Notifications** | Dashboard bell + notifications page + email for milestone approvals, meetings, funding decisions, workshops and assignments; admin announcements |
| 10 | **Reports** | Startup count, funding requested vs approved, active mentors, industry-wise startups, monthly registrations, workshop stats. Charts, saved reports, **PDF export** (paginated, branded tables) and **CSV export** |
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

*Finance* means an **approved incubation funding request** or an **accepted investor offer**.

- When the admin approves a funding request, or a founder accepts an investor offer, an approved startup moves to **Incubated automatically**. The founder, mentors and admins are notified.
- The admin's manual "Mark as incubated" button stays disabled, and the API refuses the change, until the startup has finance.
- Approved startups show an "Awaiting finance" banner; the admin dashboard lists every startup still waiting.
- Each startup shows a **Finance secured** card (incubation funding + investor commitments).

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
│   │   ├── routes/             auth, startups, documents, milestones, mentors, funding, meetings,
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
        └── components/         Layout, UI kit, FundingPanel, MeetingsPanel, InvestorMeetings, InvestorActions
```

## Database (21 tables)

`Roles`, `Users`, `Startups`, `StartupMembers`, `Mentors`, `MentorAssignments`, `Milestones`, `MilestoneUpdates`, `FundingRequests`, `MeetingRequests`, `Meetings`, `Documents`, `Workshops`, `WorkshopRegistrations`, `Notifications`, `Feedback`, `Reports`, `AuditLogs`, `Investors`, `InvestmentInterests`, `InvestorMeetings`

These map one-to-one to the Experiment 5 class diagram, plus `Reports` and `AuditLogs` from the SRS and the three investor-module tables (the brief's *Investors* and *InvestorRequests*). Key relationships: User *creates* Startup (1:\*), Startup *has* Members / Milestones / Documents / FundingRequests (1:\*), Milestone *has* MilestoneUpdates (1:\*), Mentor ↔ Startup through MentorAssignment, MeetingRequest *results in* Meeting (1:0..1), Workshop *has* WorkshopRegistrations, Mentor *provides* Feedback.

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
| Manage Funding | Student, Admin | Funding |
| Manage Workshops & Events | Student, Admin | Workshops & Events |
| Manage Users | Admin | Users |
| Assign Mentors · Verify Startup | Admin | Mentors; Startup → Approve / Reject / Assign mentor |
| Generate Reports | Admin | Reports |
| Manage Notifications | All | Bell icon, Notifications (admin: announcements) |
| Browse Startups · View Startup Profile | Investor | Browse Startups → startup page |
| Show Investment Interest · Request Meeting | Investor | Startup page → Make an offer / Request meeting; My Offers; Meetings |
| Respond to Investors | Student | Startup → Investors tab |

---

## Deployment (as recommended in the project brief)

1. **Database — Neon (PostgreSQL):** create a project and copy the connection string.
2. **Backend — Render:** new Web Service, root directory `server`, build `npm install`, start `npm start`. Environment variables: `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `NODE_ENV=production`, `CLIENT_URL=https://<your-vercel-app>.vercel.app` and the `SMTP_*` settings. SMTP is required in production: without it users can't receive verification or password-reset emails. Tables are created and demo data seeded on first boot, so change the demo passwords (or deactivate the demo accounts from **Admin → Users**) before sharing the site.
3. **Frontend — Vercel:** import the repo, root directory `client`, set `VITE_API_URL=https://<your-render-app>.onrender.com/api`. (`client/vercel.json` already rewrites all routes to `index.html` for client-side routing.)

Uploaded documents are stored on local disk (`server/uploads`). On Render's free tier that disk is temporary, so attach a persistent disk or switch storage to Cloudinary for production.

## Future scope

AI idea evaluator, AI mentor recommendation, startup score prediction, AI investor matching, chat, video meetings, Power BI analytics, mobile app.
