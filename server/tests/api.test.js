/**
 * API integration tests (node:test + supertest) against a throwaway SQLite database.
 * Run with: npm test
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'isip-test-'));
process.env.NODE_ENV = 'test';
process.env.SQLITE_PATH = path.join(tmp, 'test.sqlite');
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');

const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { sequelize } = await import('../src/models/index.js');
const { seedDatabase } = await import('../src/seed.js');

const api = request(app);
const tokens = {};
const auth = (who) => ({ Authorization: `Bearer ${tokens[who]}` });

async function login(email, password = 'Password@123') {
  const res = await api.post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 200, res.body.message);
  return res.body.token;
}

before(async () => {
  console.log = () => {}; // silence seed + console mailer output
  await sequelize.sync({ force: true });
  await seedDatabase();
  tokens.admin = await login('admin@isip.edu', 'Admin@123');
  tokens.student = await login('aarav.student@isip.edu');
  tokens.other = await login('kabir.student@isip.edu');
  tokens.mentor = await login('priya.mentor@isip.edu');
  tokens.investor = await login('vikram.investor@isip.edu');
  tokens.riya = await login('riya.student@isip.edu');
});

after(async () => {
  await sequelize.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ---------------- Module 1: Authentication ----------------
test('registration requires email verification before login', async () => {
  const email = 'new.student@test.edu';
  const reg = await api.post('/api/auth/register').send({ name: 'New Student', email, password: 'abc12345' });
  assert.equal(reg.status, 201);
  const blocked = await api.post('/api/auth/login').send({ email, password: 'abc12345' });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.needsVerification, true);
  const token = new URL(reg.body.devLink).searchParams.get('token');
  assert.equal((await api.post('/api/auth/verify-email').send({ token })).status, 200);
  assert.equal((await api.post('/api/auth/login').send({ email, password: 'abc12345' })).status, 200);
});

test('weak passwords and duplicate emails are rejected', async () => {
  assert.equal((await api.post('/api/auth/register').send({ name: 'X', email: 'x@test.edu', password: 'short' })).status, 400);
  assert.equal((await api.post('/api/auth/register').send({ name: 'X', email: 'admin@isip.edu', password: 'abc12345' })).status, 409);
});

test('password reset flow', async () => {
  const forgot = await api.post('/api/auth/forgot-password').send({ email: 'meera.student@isip.edu' });
  const token = new URL(forgot.body.devLink).searchParams.get('token');
  assert.equal((await api.post('/api/auth/reset-password').send({ token, password: 'newpass123' })).status, 200);
  await login('meera.student@isip.edu', 'newpass123');
  assert.equal((await api.post('/api/auth/reset-password').send({ token, password: 'again1234' })).status, 400, 'token is single-use');
});

test('invalid credentials and missing tokens are rejected', async () => {
  assert.equal((await api.post('/api/auth/login').send({ email: 'admin@isip.edu', password: 'wrong' })).status, 401);
  assert.equal((await api.get('/api/dashboard')).status, 401);
});

test('phone numbers are encrypted at rest', async () => {
  const [row] = await sequelize.query("SELECT phone FROM Users WHERE email = 'admin@isip.edu'", { type: 'SELECT' });
  assert.match(row.phone, /^v1:/);
  const me = await api.get('/api/auth/me').set(auth('admin'));
  assert.equal(me.body.phone, '9800000001');
});

// ---------------- Role-based access control ----------------
test('students cannot see other students\' startups or admin endpoints', async () => {
  assert.equal((await api.get('/api/startups/1').set(auth('other'))).status, 403);
  assert.equal((await api.get('/api/reports/summary').set(auth('student'))).status, 403);
  assert.equal((await api.get('/api/users').set(auth('mentor'))).status, 403);
  const mine = await api.get('/api/startups').set(auth('student'));
  assert.ok(mine.body.every((s) => s.founder.email === 'aarav.student@isip.edu'));
});

// ---------------- Module 2 & 3: Startup lifecycle + mentor assignment ----------------
test('startup lifecycle: draft → pending → approved (milestones created) → mentor assigned', async () => {
  const created = await api.post('/api/startups').set(auth('student')).send({ startupName: 'TestCo', industry: 'SaaS' });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'draft');
  const id = created.body.id;

  const incomplete = await api.post(`/api/startups/${id}/submit`).set(auth('student'));
  assert.equal(incomplete.status, 400, 'cannot submit without idea details');

  await api.put(`/api/startups/${id}`).set(auth('student')).send({ description: 'd', problemStatement: 'p', solution: 's', businessModel: 'b' });
  assert.equal((await api.post(`/api/startups/${id}/submit`).set(auth('student'))).body.status, 'pending');

  assert.equal((await api.patch(`/api/startups/${id}/status`).set(auth('admin')).send({ status: 'incubated' })).status, 400, 'must be approved first');
  assert.equal((await api.patch(`/api/startups/${id}/status`).set(auth('admin')).send({ status: 'rejected' })).status, 400, 'rejection needs a reason');
  const approved = await api.patch(`/api/startups/${id}/status`).set(auth('admin')).send({ status: 'approved' });
  assert.equal(approved.body.status, 'approved');

  const ms = await api.get(`/api/milestones?startupId=${id}`).set(auth('student'));
  assert.deepEqual(ms.body.milestones.map((m) => m.name), ['Idea Validation', 'Prototype', 'MVP', 'Customer Testing', 'Revenue', 'Funding']);

  assert.equal((await api.get(`/api/startups/${id}`).set(auth('mentor'))).status, 403, 'mentor not yet assigned');
  const assign = await api.post('/api/mentors/assignments').set(auth('admin')).send({ startupId: id, mentorId: 1 });
  assert.equal(assign.status, 201);
  assert.equal((await api.post('/api/mentors/assignments').set(auth('admin')).send({ startupId: id, mentorId: 1 })).status, 409);
  assert.equal((await api.patch(`/api/mentors/assignments/${assign.body.id}/accept`).set(auth('mentor'))).body.status, 'accepted');
  assert.equal((await api.get(`/api/startups/${id}`).set(auth('mentor'))).status, 200);
});

// ---------------- Module 4: Milestone tracking ----------------
test('mentor approval of a milestone update recalculates progress', async () => {
  const { body } = await api.get('/api/milestones?startupId=1').set(auth('mentor'));
  assert.equal(body.progress, 50);
  const pending = body.milestones.find((m) => m.status === 'submitted').updates.find((u) => u.status === 'submitted');
  const res = await api.post(`/api/milestones/updates/${pending.id}/review`).set(auth('mentor')).send({ decision: 'approved', mentorComments: 'Great' });
  assert.equal(res.status, 200);
  assert.equal(res.body.progress, 67);
  assert.equal((await api.post(`/api/milestones/updates/${pending.id}/review`).set(auth('mentor')).send({ decision: 'approved' })).status, 400, 'cannot review twice');
});

// ---------------- Module 5: Funding ----------------
test('funding: validation, admin decision and modification flow', async () => {
  assert.equal((await api.post('/api/funding').set(auth('student')).send({ startupId: 1, purpose: 'x', amount: -5 })).status, 400);
  assert.equal((await api.post('/api/funding').set(auth('other')).send({ startupId: 4, purpose: 'x', amount: 100 })).status, 400, 'pending startup cannot request funding');

  const req = await api.post('/api/funding').set(auth('student')).send({ startupId: 1, purpose: 'Servers', amount: 50000 });
  assert.equal(req.status, 201);
  const mod = await api.patch(`/api/funding/${req.body.id}/decision`).set(auth('admin')).send({ status: 'modification_requested', adminRemarks: 'Add quotes' });
  assert.equal(mod.body.status, 'modification_requested');
  const resub = await api.put(`/api/funding/${req.body.id}`).set(auth('student')).send({ purpose: 'Servers (with quotes)', amount: 45000 });
  assert.equal(resub.body.status, 'pending');
  assert.equal((await api.patch(`/api/funding/${req.body.id}/decision`).set(auth('admin')).send({ status: 'approved', approvedAmount: 99999 })).status, 400, 'cannot exceed requested');
  const ok = await api.patch(`/api/funding/${req.body.id}/decision`).set(auth('admin')).send({ status: 'approved', approvedAmount: 40000 });
  assert.equal(ok.body.status, 'approved');
  assert.equal((await api.put(`/api/funding/${req.body.id}`).set(auth('student')).send({ purpose: 'x', amount: 1 })).status, 400, 'approved request is locked');
});

// ---------------- Module 6: Meetings ----------------
test('meeting request → mentor accept creates a meeting; other mentors cannot respond', async () => {
  const future = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  const req = await api.post('/api/meetings/requests').set(auth('student')).send({ startupId: 1, mentorId: 1, requestedDate: future, requestedTime: '15:00', agenda: 'Review' });
  assert.equal(req.status, 201);
  const rahul = await login('rahul.mentor@isip.edu');
  assert.equal((await api.patch(`/api/meetings/requests/${req.body.id}`).set({ Authorization: `Bearer ${rahul}` }).send({ action: 'accept' })).status, 403);
  const acc = await api.patch(`/api/meetings/requests/${req.body.id}`).set(auth('mentor')).send({ action: 'accept' });
  assert.equal(acc.body.meeting.date, future);
  assert.equal((await api.post('/api/meetings/requests').set(auth('student')).send({ startupId: 1, mentorId: 2, requestedDate: future, requestedTime: '15:00' })).status, 400, 'mentor not assigned');
});

// ---------------- Module 8: Workshops ----------------
test('workshop registration, attendance and certificate', async () => {
  // Held today: registration is still open and attendance can be recorded.
  const d = new Date();
  const todayLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const w = await api.post('/api/workshops').set(auth('admin')).send({ title: 'Test WS', type: 'workshop', date: todayLocal, capacity: 1 });
  assert.equal(w.status, 201);
  const reg = await api.post(`/api/workshops/${w.body.id}/register`).set(auth('student'));
  assert.equal(reg.status, 201);
  assert.equal((await api.post(`/api/workshops/${w.body.id}/register`).set(auth('other'))).status, 400, 'capacity reached');
  assert.equal((await api.get(`/api/workshops/registrations/${reg.body.id}/certificate`).set(auth('student'))).status, 400, 'no certificate before attendance');
  await api.patch(`/api/workshops/registrations/${reg.body.id}/attendance`).set(auth('admin')).send({ attendanceStatus: 'present' });
  const cert = await api.get(`/api/workshops/registrations/${reg.body.id}/certificate`).set(auth('student'));
  assert.equal(cert.status, 200);
  assert.equal(cert.headers['content-type'], 'application/pdf');
});

// ---------------- Module 9 & 10: Notifications, reports, audit ----------------
test('notifications are created by workflow events', async () => {
  const res = await api.get('/api/notifications').set(auth('student'));
  assert.ok(res.body.items.some((n) => n.message.includes('Funding approved')));
  assert.ok(res.body.unread > 0);
  await api.patch('/api/notifications/read-all').set(auth('student'));
  assert.equal((await api.get('/api/notifications').set(auth('student'))).body.unread, 0);
});

test('reports: summary, generation and CSV export', async () => {
  const s = await api.get('/api/reports/summary').set(auth('admin'));
  assert.ok(s.body.totals.startups >= 5);
  assert.ok(s.body.industry.AgriTech >= 1);
  const gen = await api.post('/api/reports/generate').set(auth('admin')).send({ reportType: 'startups' });
  assert.equal(gen.status, 201);
  const csv = await api.get(`/api/reports/${gen.body.id}/csv`).set(auth('admin'));
  assert.match(csv.text, /Startup,Industry,Status/);
});

test('state-changing requests are audit-logged', async () => {
  await new Promise((r) => setTimeout(r, 100));
  const logs = await api.get('/api/reports/audit/logs').set(auth('admin'));
  assert.ok(logs.body.some((l) => l.action === 'Login'));
  assert.ok(logs.body.some((l) => l.path.startsWith('/api/funding')));
});

// ---------------- Investor module + "incubated only once financed" ----------------
test('investors only see approved/incubated startups and cannot reach internal data', async () => {
  const list = await api.get('/api/startups').set(auth('investor'));
  assert.equal(list.status, 200);
  assert.ok(list.body.length > 0);
  assert.ok(list.body.every((s) => ['approved', 'incubated'].includes(s.status)));
  assert.ok(list.body.every((s) => s.adminRemarks === undefined), 'admin remarks are hidden');
  assert.equal((await api.get('/api/startups/4').set(auth('investor'))).status, 403, 'pending startup hidden');
  assert.equal((await api.get('/api/startups/2').set(auth('investor'))).status, 200);
  assert.equal((await api.get('/api/documents?startupId=1').set(auth('investor'))).status, 200, 'can read pitch documents');
  assert.equal((await api.get('/api/funding').set(auth('investor'))).status, 403);
  assert.equal((await api.get('/api/feedback?startupId=1').set(auth('investor'))).status, 403);
  assert.equal((await api.put('/api/startups/2').set(auth('investor')).send({ startupName: 'x' })).status, 403);
});

test('admin cannot incubate an approved startup without finance', async () => {
  // CampusEats (id 3) is approved with only a pending funding request.
  const res = await api.patch('/api/startups/3/status').set(auth('admin')).send({ status: 'incubated' });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /secures finance/);
});

test('approving funding auto-incubates the startup', async () => {
  const pending = (await api.get('/api/funding?startupId=3&status=pending').set(auth('admin'))).body[0];
  const res = await api.patch(`/api/funding/${pending.id}/decision`).set(auth('admin')).send({ status: 'approved' });
  assert.equal(res.body.incubated, true);
  assert.equal((await api.get('/api/startups/3').set(auth('admin'))).body.status, 'incubated');
});

test('investor offer → founder accepts → startup is financed and incubated', async () => {
  // MediTrack (id 2) is approved with an existing pending offer from Vikram.
  const dup = await api.post('/api/investors/interests').set(auth('investor')).send({ startupId: 2, amount: 100000 });
  assert.equal(dup.status, 409, 'one pending offer per startup');
  assert.equal((await api.post('/api/investors/interests').set(auth('investor')).send({ startupId: 4, amount: 100000 })).status, 403, 'cannot invest in unapproved startup');
  assert.equal((await api.post('/api/investors/interests').set(auth('investor')).send({ startupId: 1, amount: 100000, equity: 150 })).status, 400);

  const offers = await api.get('/api/investors/interests?startupId=2').set(auth('riya'));
  const offer = offers.body.find((o) => o.status === 'pending');
  assert.ok(offer);
  assert.equal((await api.patch(`/api/investors/interests/${offer.id}/respond`).set(auth('other')).send({ decision: 'accepted' })).status, 403, 'only the founder responds');
  const res = await api.patch(`/api/investors/interests/${offer.id}/respond`).set(auth('riya')).send({ decision: 'accepted', note: 'Welcome aboard' });
  assert.equal(res.status, 200);
  assert.equal(res.body.incubated, true);
  const s = await api.get('/api/startups/2').set(auth('riya'));
  assert.equal(s.body.status, 'incubated');
  assert.equal(s.body.finance.investmentCommitted, 500000);
  const notes = await api.get('/api/notifications').set(auth('investor'));
  assert.ok(notes.body.items.some((n) => n.message.includes('accepted your offer')));
});

test('investor meetings: request, founder reschedules, investor withdraws offer', async () => {
  const future = new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10);
  const later = new Date(Date.now() + 11 * 864e5).toISOString().slice(0, 10);
  const m = await api.post('/api/investors/meetings').set(auth('investor')).send({ startupId: 1, date: future, time: '10:30', agenda: 'Follow-on' });
  assert.equal(m.status, 201);
  assert.equal((await api.patch(`/api/investors/meetings/${m.body.id}`).set(auth('investor')).send({ action: 'accept' })).status, 400, 'investor cannot accept own request');
  const r = await api.patch(`/api/investors/meetings/${m.body.id}`).set(auth('student')).send({ action: 'reschedule', date: later, time: '11:00' });
  assert.equal(r.body.status, 'pending', 'a counter-proposal needs the other side to confirm');
  assert.equal(r.body.awaiting, 'investor');
  assert.equal(r.body.date, later);
  assert.equal((await api.patch(`/api/investors/meetings/${m.body.id}`).set(auth('student')).send({ action: 'accept' })).status, 400, 'founder cannot confirm own proposal');
  assert.equal((await api.patch(`/api/investors/meetings/${m.body.id}`).set(auth('investor')).send({ action: 'accept' })).body.status, 'accepted');

  const offer = await api.post('/api/investors/interests').set(auth('investor')).send({ startupId: 1, amount: 300000, instrument: 'SAFE' });
  assert.equal(offer.status, 201);
  assert.equal((await api.patch(`/api/investors/interests/${offer.body.id}/withdraw`).set(auth('investor'))).body.status, 'withdrawn');
});

test('investor registration creates an investor profile', async () => {
  const email = 'angel@test.edu';
  const reg = await api.post('/api/auth/register').send({ name: 'Test Angel', email, password: 'abc12345', role: 'investor', firmName: 'Test Fund', investorType: 'Angel', ticketMin: 100000, ticketMax: 500000 });
  assert.equal(reg.status, 201);
  await api.post('/api/auth/verify-email').send({ token: new URL(reg.body.devLink).searchParams.get('token') });
  const token = await login(email, 'abc12345');
  const me = await api.get('/api/auth/me').set({ Authorization: `Bearer ${token}` });
  assert.equal(me.body.role, 'investor');
  assert.equal(me.body.investorProfile.firmName, 'Test Fund');
  const dash = await api.get('/api/dashboard').set({ Authorization: `Bearer ${token}` });
  assert.equal(dash.status, 200);
  assert.ok(dash.body.recommended.length > 0);
});

// ---------------- Regression tests ----------------
test('team members with a blank email are accepted (stored as null)', async () => {
  const created = await api.post('/api/startups').set(auth('student')).send({
    startupName: 'BlankEmailCo', industry: 'SaaS', members: [{ name: 'Asha', email: '', role: 'CTO' }, { name: '  ' }],
  });
  assert.equal(created.status, 201, created.body.message);
  const detail = await api.get(`/api/startups/${created.body.id}`).set(auth('student'));
  assert.equal(detail.body.members.length, 1);
  assert.equal(detail.body.members[0].email, null);
  const bad = await api.post(`/api/startups/${created.body.id}/members`).set(auth('student')).send({ name: 'X', email: 'not-an-email' });
  assert.equal(bad.status, 400);
  assert.match(bad.body.message, /valid team member email/);
});

test('CSV export neutralises spreadsheet formulas', async () => {
  await api.post('/api/startups').set(auth('student')).send({ startupName: '=HYPERLINK("http://evil")', industry: 'SaaS' });
  const gen = await api.post('/api/reports/generate').set(auth('admin')).send({ reportType: 'startups' });
  const csv = await api.get(`/api/reports/${gen.body.id}/csv`).set(auth('admin'));
  assert.ok(csv.text.includes(`"'=HYPERLINK(""http://evil"")"`));
});

test('meetings cannot be booked for a time that has already passed today', async () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const res = await api.post('/api/meetings/requests').set(auth('student')).send({ startupId: 1, mentorId: 1, requestedDate: todayLocal, requestedTime: '00:00' });
  assert.equal(res.status, 400);
});

// ---------------- People profiles ----------------
test('public profiles show work and achievements but hide private data', async () => {
  const aarav = await api.get('/api/people/5').set(auth('investor'));
  assert.equal(aarav.status, 200);
  assert.equal(aarav.body.person.name, 'Aarav Patel');
  assert.equal(aarav.body.person.phone, undefined, 'phone is private');
  assert.ok(aarav.body.startups.some((s) => s.startupName === 'AgriSense'));
  assert.ok(aarav.body.achievements.some((a) => a.title === 'Incubated founder'));

  // Kabir (id 7) has a pending startup: hidden from others, visible to himself.
  const others = await api.get('/api/people/7').set(auth('investor'));
  assert.ok(others.body.startups.every((s) => ['approved', 'incubated'].includes(s.status)));
  const self = await api.get('/api/people/7').set(auth('other'));
  assert.ok(self.body.isSelf);
  assert.ok(self.body.startups.some((s) => s.status === 'pending'));
  assert.ok(self.body.person.phone);

  // Investor portfolio is public; pending offers are not.
  const vikram = await api.get('/api/people/9').set(auth('student'));
  assert.ok(vikram.body.portfolio.length >= 1);
  assert.equal(vikram.body.openOffers, undefined);
  const mentor = await api.get('/api/people/2').set(auth('student'));
  assert.ok(mentor.body.mentorships.length >= 1);
  assert.equal((await api.get('/api/people/9999').set(auth('student'))).status, 404);
});

test('profile edits are saved and links normalised', async () => {
  const res = await api.put('/api/auth/profile').set(auth('student')).send({ headline: 'Builder', about: 'Hello', skills: 'IoT, React', linkedin: 'linkedin.com/in/test', website: '' });
  assert.equal(res.status, 200);
  assert.equal(res.body.linkedin, 'https://linkedin.com/in/test');
  assert.equal(res.body.website, null);
  const p = await api.get('/api/people/5').set(auth('mentor'));
  assert.deepEqual(p.body.person.skills, ['IoT', 'React']);
});

test('workshops are for students (admin manages them); mentors and investors are blocked', async () => {
  assert.equal((await api.get('/api/workshops').set(auth('student'))).status, 200);
  assert.equal((await api.get('/api/workshops').set(auth('admin'))).status, 200);
  assert.equal((await api.get('/api/workshops').set(auth('mentor'))).status, 403);
  assert.equal((await api.get('/api/workshops').set(auth('investor'))).status, 403);
  assert.equal((await api.post('/api/workshops/1/register').set(auth('investor'))).status, 403);
  const mentorProfile = await api.get('/api/people/2').set(auth('student'));
  assert.equal(mentorProfile.body.certificates, undefined);
});

// ---------------- Meeting lifecycle automation ----------------
test('unconfirmed requests expire, no-shows are missed, checked-in meetings complete automatically', async () => {
  const { MeetingRequest, Meeting, InvestorMeeting } = await import('../src/models/index.js');
  const { sweepMeetings } = await import('../src/services/meetingLifecycle.js');
  const pad = (n) => String(n).padStart(2, '0');
  const slot = (minutesFromNow) => {
    const d = new Date(Date.now() + minutesFromNow * 60000);
    return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
  };
  const past = slot(-30);      // started 30 min ago → beyond the 10-min grace
  const recent = slot(-3);     // started 3 min ago → still inside the grace period
  const longAgo = slot(-90);   // beyond the 60-min auto-complete window

  const req = await MeetingRequest.create({ startupId: 1, mentorId: 1, requestedById: 5, requestedDate: past.date, requestedTime: past.time });
  const fresh = await MeetingRequest.create({ startupId: 1, mentorId: 1, requestedById: 5, requestedDate: recent.date, requestedTime: recent.time });
  const noShow = await Meeting.create({ startupId: 1, mentorId: 1, ...past, status: 'scheduled' });
  const attended = await Meeting.create({ startupId: 1, mentorId: 1, ...longAgo, status: 'scheduled', checkedInAt: new Date() });
  const invPending = await InvestorMeeting.create({ investorId: 1, startupId: 1, ...past, status: 'pending' });
  const invNoShow = await InvestorMeeting.create({ investorId: 1, startupId: 1, ...past, status: 'accepted' });

  await sweepMeetings({ force: true });

  assert.equal((await req.reload()).status, 'expired');
  assert.equal((await fresh.reload()).status, 'pending', 'still within the 10-minute grace period');
  assert.equal((await noShow.reload()).status, 'missed');
  assert.match(noShow.notes, /no one checked in/);
  assert.equal((await attended.reload()).status, 'completed');
  assert.equal((await invPending.reload()).status, 'expired');
  assert.equal((await invNoShow.reload()).status, 'missed');

  const notes = await api.get('/api/notifications').set(auth('student'));
  assert.ok(notes.body.items.some((n) => /marked as missed/.test(n.message)));
});

test('check-in is only possible around the meeting start time', async () => {
  const { Meeting } = await import('../src/models/index.js');
  const pad = (n) => String(n).padStart(2, '0');
  const slot = (m) => { const d = new Date(Date.now() + m * 60000); return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; };
  const soon = await Meeting.create({ startupId: 1, mentorId: 1, ...slot(5), status: 'scheduled' });
  const later = await Meeting.create({ startupId: 1, mentorId: 1, ...slot(180), status: 'scheduled' });

  const early = await api.patch(`/api/meetings/${later.id}`).set(auth('mentor')).send({ action: 'checkin' });
  assert.equal(early.status, 400);
  assert.match(early.body.message, /opens 15 minutes before/);
  assert.equal((await api.patch(`/api/meetings/${later.id}`).set(auth('mentor')).send({ action: 'complete' })).status, 400, 'cannot complete before start');

  const ok = await api.patch(`/api/meetings/${soon.id}`).set(auth('student')).send({ action: 'checkin' });
  assert.equal(ok.status, 200);
  assert.ok((await soon.reload()).checkedInAt);
});

// ---------------- Pitch meetings & mentor-scheduled meetings ----------------
test('founders can pitch to investors from the directory; the investor confirms', async () => {
  const dir = await api.get('/api/investors/directory').set(auth('student'));
  assert.equal(dir.status, 200);
  const vikram = dir.body.find((i) => i.name === 'Vikram Malhotra');
  assert.ok(vikram && vikram.focusIndustries.includes('AgriTech'));
  assert.equal((await api.get('/api/investors/directory').set(auth('investor'))).status, 403);

  const future = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  const docs = await api.get('/api/documents?startupId=1').set(auth('student'));
  const pitch = await api.post('/api/investors/meetings').set(auth('student')).send({
    investorId: vikram.id, startupId: 1, date: future, time: '15:00', askAmount: 2500000, deckId: docs.body[0].id, location: 'https://meet.example/pitch',
  });
  assert.equal(pitch.status, 201, pitch.body.message);
  assert.equal(pitch.body.kind, 'pitch');
  assert.equal(pitch.body.awaiting, 'investor');
  assert.equal((await api.post('/api/investors/meetings').set(auth('student')).send({ investorId: vikram.id, startupId: 1, date: future, time: '16:00' })).status, 409, 'one pending request per investor');
  assert.equal((await api.post('/api/investors/meetings').set(auth('other')).send({ investorId: vikram.id, startupId: 4, date: future, time: '16:00' })).status, 400, 'unapproved startups cannot pitch');
  assert.equal((await api.patch(`/api/investors/meetings/${pitch.body.id}`).set(auth('student')).send({ action: 'accept' })).status, 400);

  const list = await api.get('/api/investors/meetings').set(auth('investor'));
  const mine = list.body.find((m) => m.id === pitch.body.id);
  assert.equal(Number(mine.askAmount), 2500000);
  assert.ok(mine.deck?.fileName);
  assert.equal((await api.patch(`/api/investors/meetings/${pitch.body.id}`).set(auth('investor')).send({ action: 'accept' })).body.status, 'accepted');
  const notes = await api.get('/api/notifications').set(auth('student'));
  assert.ok(notes.body.items.some((n) => /pitch meeting .* was confirmed/.test(n.message)));
});

test('mentors can schedule meetings directly with their startups', async () => {
  const future = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const ok = await api.post('/api/meetings').set(auth('mentor')).send({ startupId: 1, date: future, time: '10:00', agenda: 'Weekly check-in', location: 'Room 4' });
  assert.equal(ok.status, 201, ok.body.message);
  assert.equal(ok.body.status, 'scheduled');
  assert.equal(ok.body.scheduledBy, 'mentor');
  assert.equal((await api.post('/api/meetings').set(auth('mentor')).send({ startupId: 4, date: future, time: '10:00' })).status, 403, 'not their startup');
  assert.equal((await api.post('/api/meetings').set(auth('student')).send({ startupId: 1, date: future, time: '10:00' })).status, 403);
  const founderView = await api.get('/api/meetings').set(auth('student'));
  assert.ok(founderView.body.some((m) => m.id === ok.body.id && m.location === 'Room 4'));
});

// ---------------- Regression: glitch sweep ----------------
test('data limits: over-long text and absurd amounts are rejected with clear messages', async () => {
  const long = await api.post('/api/startups').set(auth('student')).send({ startupName: 'x'.repeat(300), industry: 'SaaS' });
  assert.equal(long.status, 400);
  assert.match(long.body.message, /Startup Name must be at most 150 characters/);
  const huge = await api.post('/api/funding').set(auth('student')).send({ startupId: 1, purpose: 'x', amount: 1e15 });
  assert.equal(huge.status, 400);
  assert.match(huge.body.message, /too large/);
});

test('attendance cannot be recorded before the workshop date', async () => {
  const future = new Date(Date.now() + 5 * 864e5);
  const date = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
  const w = await api.post('/api/workshops').set(auth('admin')).send({ title: 'Later WS', type: 'training', date });
  const reg = await api.post(`/api/workshops/${w.body.id}/register`).set(auth('student'));
  const res = await api.patch(`/api/workshops/registrations/${reg.body.id}/attendance`).set(auth('admin')).send({ attendanceStatus: 'present' });
  assert.equal(res.status, 400);
});

test('mentors cannot be double-booked', async () => {
  const d = new Date(Date.now() + 12 * 864e5);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  assert.equal((await api.post('/api/meetings').set(auth('mentor')).send({ startupId: 1, date, time: '14:00' })).status, 201);
  const clash = await api.post('/api/meetings').set(auth('mentor')).send({ startupId: 1, date, time: '14:15' });
  assert.equal(clash.status, 409);
  assert.equal((await api.post('/api/meetings').set(auth('mentor')).send({ startupId: 1, date, time: '15:00' })).status, 201, 'a later slot is fine');
});

test('removing a mentor closes their pending requests and blocks further action', async () => {
  const d = new Date(Date.now() + 13 * 864e5);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const assign = await api.post('/api/mentors/assignments').set(auth('admin')).send({ startupId: 1, mentorId: 3 });
  const anita = await login('anita.mentor@isip.edu');
  const req = await api.post('/api/meetings/requests').set(auth('student')).send({ startupId: 1, mentorId: 3, requestedDate: date, requestedTime: '09:00' });
  await api.delete(`/api/mentors/assignments/${assign.body.id}`).set(auth('admin'));
  const r = await api.get('/api/meetings/requests?startupId=1').set(auth('student'));
  assert.equal(r.body.find((x) => x.id === req.body.id).status, 'rejected');
  assert.equal((await api.patch(`/api/meetings/requests/${req.body.id}`).set({ Authorization: `Bearer ${anita}` }).send({ action: 'accept' })).status, 400);
});

test('reports can be exported as a paginated PDF', async () => {
  const gen = await api.post('/api/reports/generate').set(auth('admin')).send({ reportType: 'funding' });
  const pdf = await api.get(`/api/reports/${gen.body.id}/pdf`).set(auth('admin')).buffer(true).parse((res, cb) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => cb(null, Buffer.concat(chunks)));
  });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers['content-type'], 'application/pdf');
  assert.match(pdf.headers['content-disposition'], /isip-funding-report-\d+\.pdf/);
  assert.equal(pdf.body.subarray(0, 5).toString(), '%PDF-');
  assert.equal((await api.get(`/api/reports/${gen.body.id}/pdf`).set(auth('student'))).status, 403);
});
