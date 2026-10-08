/**
 * Demo data for development and presentations.
 *   npm run seed   → wipes the database and reloads this data.
 * The server also runs it automatically the first time it starts on an empty database.
 *
 * Demo logins (development only):
 *   Admin    admin@isip.edu            Admin@123
 *   Mentors  priya.mentor@isip.edu     Password@123   (also rahul.mentor@, anita.mentor@)
 *   Students aarav.student@isip.edu    Password@123   (also riya.student@, kabir.student@, meera.student@)
 *   Investors vikram.investor@isip.edu Password@123   (also neha.investor@)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import bcrypt from 'bcryptjs';
import PDFDocument from 'pdfkit';
import {
  sequelize, Role, User, Mentor, Startup, StartupMember, MentorAssignment, Milestone, MilestoneUpdate,
  MeetingRequest, Meeting, Document, Workshop, WorkshopRegistration, Notification, Feedback, DEFAULT_MILESTONES,
  Investor, InvestmentInterest, InvestorMeeting,
} from './models/index.js';
import { UPLOAD_DIR } from './middleware/upload.js';
import { humanSlot } from './utils/http.js';

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (n) => new Date(Date.now() + n * DAY);
const dateOnly = (n) => daysFromNow(n).toISOString().slice(0, 10);

function writeSamplePdf(fileName, title, lines) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(path.join(UPLOAD_DIR, fileName));
    doc.pipe(stream);
    doc.fontSize(24).text(title).moveDown();
    lines.forEach((l) => doc.fontSize(13).text(`• ${l}`).moveDown(0.4));
    doc.end();
    stream.on('finish', () => resolve(fs.statSync(path.join(UPLOAD_DIR, fileName)).size));
  });
}

export async function seedDatabase({ reset = false } = {}) {
  if (reset) {
    // Tables of removed models (admin-granted funding requests) would block dropping the tables they reference.
    await sequelize.getQueryInterface().dropTable('FundingRequests');
    await sequelize.sync({ force: true });
    for (const f of fs.readdirSync(UPLOAD_DIR)) if (f.startsWith('seed-')) fs.unlinkSync(path.join(UPLOAD_DIR, f));
  }

  const [student, mentor, admin, investorRole] = await Role.bulkCreate([
    { roleName: 'student', description: 'Student Entrepreneur — submits and manages startups' },
    { roleName: 'mentor', description: 'Mentor — reviews and guides assigned startups' },
    { roleName: 'admin', description: 'Incubation Manager — verifies startups, assigns mentors, reviews funding transactions' },
    { roleName: 'investor', description: 'Investor — browses approved startups and makes investment offers' },
  ]);

  const pw = await bcrypt.hash('Password@123', 10);
  const mkUser = (name, email, roleId, monthsAgo, phone, profile = {}) => User.create({
    name, email, phone, roleId, password: pw, status: 'active', emailVerified: true, createdAt: daysFromNow(-30 * monthsAgo - 3), ...profile,
  });

  const kavita = await User.create({
    name: 'Dr. Kavita Rao', email: 'admin@isip.edu', roleId: admin.id, password: await bcrypt.hash('Admin@123', 10), status: 'active', emailVerified: true, phone: '9800000001', createdAt: daysFromNow(-190),
    headline: 'Head, Incubation & Innovation Cell', about: 'Runs the campus incubation programme: startup verification, mentor network, seed fund and investor connects. 15 years in technology entrepreneurship education.',
    skills: 'Startup Evaluation, Programme Management, Ecosystem Building', linkedin: 'https://linkedin.com/in/kavita-rao-demo',
  });

  const priyaU = await mkUser('Priya Sharma', 'priya.mentor@isip.edu', mentor.id, 5, '9800000011', { headline: 'Founder-turned-mentor · AgriTech & IoT', skills: 'IoT, Hardware, Product Strategy, Go-to-market', linkedin: 'https://linkedin.com/in/priya-sharma-demo' });
  const rahulU = await mkUser('Rahul Mehta', 'rahul.mentor@isip.edu', mentor.id, 4, '9800000012', { headline: 'Healthcare operator & angel investor', skills: 'HealthTech, Regulatory, Fundraising' });
  const anitaU = await mkUser('Anita Desai', 'anita.mentor@isip.edu', mentor.id, 3, '9800000013', { headline: 'Growth lead · EdTech & consumer apps', skills: 'Growth Marketing, EdTech, Community' });
  const priya = await Mentor.create({ userId: priyaU.id, expertise: 'AgriTech, IoT, Product Strategy', bio: 'Ex-founder with 10 years in agri-IoT products.', availability: 'Mon, Wed, Fri · 4–6 PM', rating: 4 });
  const rahul = await Mentor.create({ userId: rahulU.id, expertise: 'HealthTech, Regulatory, Fundraising', bio: 'Angel investor and healthcare operator.', availability: 'Tue, Thu · 5–7 PM' });
  const anita = await Mentor.create({ userId: anitaU.id, expertise: 'EdTech, Marketing, Go-to-market', bio: 'Growth lead at two consumer startups.', availability: 'Weekends' });

  const aarav = await mkUser('Aarav Patel', 'aarav.student@isip.edu', student.id, 5, '9800000021', {
    headline: 'Founder & CEO, AgriSense · B.Tech Electronics, final year',
    about: 'Grew up in a farming family in Nashik and saw first-hand how much water and power is wasted on guesswork irrigation. Building AgriSense to give small farmers sensor-driven, local-language irrigation advice. Previously built a drone-based crop-health prototype that won the state-level Smart India Hackathon.',
    skills: 'Embedded Systems, IoT, PCB Design, Product Management, Field Research',
    linkedin: 'https://linkedin.com/in/aarav-patel-demo', website: 'https://agrisense.example',
  });
  const riya = await mkUser('Riya Kulkarni', 'riya.student@isip.edu', student.id, 4, '9800000022', {
    headline: 'Founder, MediTrack · B.Tech Computer Engineering',
    about: 'Building MediTrack after watching my grandparents struggle with medication schedules. Interned at a hospital IT team and led the college\'s health-tech club.',
    skills: 'Full-stack Development, React, Node.js, Healthcare UX',
    linkedin: 'https://linkedin.com/in/riya-kulkarni-demo',
  });
  const kabir = await mkUser('Kabir Singh', 'kabir.student@isip.edu', student.id, 2, '9800000023', {
    headline: 'Founder, CampusEats & LearnLoop · Mobile developer',
    about: 'Serial campus builder. Shipped three Flutter apps used by 2,000+ students. Loves solving everyday campus problems with simple products.',
    skills: 'Flutter, Firebase, Payments, Growth Hacking',
  });
  const meera = await mkUser('Meera Iyer', 'meera.student@isip.edu', student.id, 1, '9800000024', { headline: 'Sustainability enthusiast · B.Des', skills: 'Product Design, Branding, Sustainability' });

  const vikramU = await mkUser('Vikram Malhotra', 'vikram.investor@isip.edu', investorRole.id, 3, '9800000031', { headline: 'Partner, Sahyadri Angels · ex-founder (exited 2019)', skills: 'Early-stage Investing, AgriTech, Hardware Startups', linkedin: 'https://linkedin.com/in/vikram-malhotra-demo' });
  const nehaU = await mkUser('Neha Kapoor', 'neha.investor@isip.edu', investorRole.id, 1, '9800000032', { headline: 'Principal, Blue Lotus Ventures', skills: 'Seed Investing, Consumer Tech, EdTech' });
  const vikram = await Investor.create({
    userId: vikramU.id, firmName: 'Sahyadri Angels', investorType: 'Angel Network', focusIndustries: 'AgriTech, HealthTech, CleanTech',
    ticketMin: 200000, ticketMax: 2500000, bio: 'Angel network backing rural-impact and health startups from Tier-2 campuses.', website: 'https://sahyadri-angels.example',
  });
  const neha = await Investor.create({
    userId: nehaU.id, firmName: 'Blue Lotus Ventures', investorType: 'Venture Capital', focusIndustries: 'EdTech, FoodTech, SaaS',
    ticketMin: 1000000, ticketMax: 10000000, bio: 'Seed-stage VC fund focused on consumer and education products.', website: 'https://bluelotus.example',
  });

  const mkStartup = (data, founder, daysAgo) => Startup.create({ ...data, createdById: founder.id, createdAt: daysFromNow(-daysAgo), submittedAt: data.status === 'draft' ? null : daysFromNow(-daysAgo + 2) });
  const agri = await mkStartup({
    startupName: 'AgriSense', industry: 'AgriTech', status: 'incubated', rating: 4,
    description: 'Low-cost soil sensors and an app that tell small farmers exactly when and how much to irrigate.',
    problemStatement: 'Small farmers over-irrigate by 30–40%, wasting water and electricity and damaging crops.',
    solution: 'Solar-powered soil moisture sensors with SMS/app alerts in local languages.',
    businessModel: 'Hardware sale (₹2,500/sensor) plus ₹99/month subscription for advisory.',
    technologyStack: 'ESP32, LoRaWAN, Node.js, React Native, PostgreSQL',
  }, aarav, 140);
  const medi = await mkStartup({
    startupName: 'MediTrack', industry: 'HealthTech', status: 'approved',
    description: 'Medication adherence tracker for elderly patients with caregiver alerts.',
    problemStatement: '50% of elderly patients with chronic illness miss doses regularly.',
    solution: 'Smart pill box + WhatsApp reminders + caregiver dashboard.',
    businessModel: 'B2B2C via clinics; ₹149/month per patient.',
    technologyStack: 'React, Express, Twilio, MongoDB',
  }, riya, 100);
  const eats = await mkStartup({
    startupName: 'CampusEats', industry: 'FoodTech', status: 'approved',
    description: 'Pre-order food from campus canteens and skip the queue.',
    problemStatement: 'Students waste 20+ minutes in canteen queues during short breaks.',
    solution: 'Pre-order and pickup-slot app integrated with canteen POS.',
    businessModel: '5% commission per order from canteen vendors.',
    technologyStack: 'Flutter, Firebase, Razorpay',
  }, kabir, 60);
  const learn = await mkStartup({
    startupName: 'LearnLoop', industry: 'EdTech', status: 'pending',
    description: 'Peer-to-peer doubt solving platform for engineering students.',
    problemStatement: 'Students struggle to get quick help on specific doubts outside class.',
    solution: 'Match doubts with seniors who solved similar problems; micro-payments for answers.',
    businessModel: 'Freemium with paid priority answers; 20% platform fee.',
    technologyStack: 'Next.js, Supabase, OpenAI API',
  }, kabir, 20);
  const fin = await mkStartup({
    startupName: 'FinFlow', industry: 'FinTech', status: 'rejected',
    adminRemarks: 'Business model needs clearer revenue path and regulatory compliance plan (RBI PA guidelines).',
    description: 'Automated expense splitting for hostels.', problemStatement: 'Shared expenses cause disputes.',
    solution: 'UPI-linked auto-split wallet.', businessModel: 'Interchange fees.', technologyStack: 'Kotlin, Spring Boot',
  }, meera, 35);
  await mkStartup({
    startupName: 'GreenCart', industry: 'E-commerce', status: 'draft',
    description: 'Marketplace for upcycled and sustainable products made by students.', technologyStack: 'React, Node.js',
  }, meera, 6);

  await StartupMember.bulkCreate([
    { startupId: agri.id, name: 'Aarav Patel', email: 'aarav.student@isip.edu', role: 'CEO & Hardware' },
    { startupId: agri.id, name: 'Ishaan Verma', email: 'ishaan@isip.edu', role: 'CTO' },
    { startupId: agri.id, name: 'Nisha Rao', email: 'nisha@isip.edu', role: 'Field Operations' },
    { startupId: medi.id, name: 'Riya Kulkarni', email: 'riya.student@isip.edu', role: 'Founder' },
    { startupId: medi.id, name: 'Dev Shah', email: 'dev@isip.edu', role: 'Developer' },
    { startupId: eats.id, name: 'Kabir Singh', email: 'kabir.student@isip.edu', role: 'Founder' },
    { startupId: learn.id, name: 'Kabir Singh', email: 'kabir.student@isip.edu', role: 'Founder' },
    { startupId: learn.id, name: 'Tanya Joshi', email: 'tanya@isip.edu', role: 'Product' },
  ]);

  await MentorAssignment.bulkCreate([
    { startupId: agri.id, mentorId: priya.id, status: 'accepted', assignedDate: daysFromNow(-120) },
    { startupId: medi.id, mentorId: rahul.id, status: 'assigned', assignedDate: daysFromNow(-4) },
    { startupId: eats.id, mentorId: anita.id, status: 'accepted', assignedDate: daysFromNow(-45) },
  ]);

  // Milestones — AgriSense: 3 done, 4th submitted; MediTrack: 1 done; CampusEats: 1 done.
  const addMilestones = async (startup, doneCount, submittedIdx) => {
    const ms = await Milestone.bulkCreate(DEFAULT_MILESTONES.map((m, i) => ({
      ...m, startupId: startup.id, order: i + 1,
      status: i < doneCount ? 'completed' : i === submittedIdx ? 'submitted' : i === doneCount ? 'in_progress' : 'pending',
      completedAt: i < doneCount ? daysFromNow(-90 + i * 25) : null,
      dueDate: dateOnly(-60 + i * 30),
    })));
    startup.progress = Math.round((doneCount * 100) / ms.length);
    await startup.save();
    return ms;
  };
  const agriMs = await addMilestones(agri, 3, 3);
  const mediMs = await addMilestones(medi, 1, -1);
  await addMilestones(eats, 1, -1);

  await MilestoneUpdate.bulkCreate([
    { milestoneId: agriMs[0].id, submittedById: aarav.id, status: 'approved', comments: 'Interviewed 60 farmers across 4 villages; 82% confirmed the problem.', mentorComments: 'Strong validation. Move to prototype.', reviewedAt: daysFromNow(-90) },
    { milestoneId: agriMs[2].id, submittedById: aarav.id, status: 'approved', comments: 'MVP deployed on 15 farms with app + SMS alerts.', mentorComments: 'Great execution.', reviewedAt: daysFromNow(-40) },
    { milestoneId: agriMs[3].id, submittedById: aarav.id, status: 'submitted', comments: 'Customer testing done with 40 paying pilot users; average 28% water saved. Report uploaded.' },
    { milestoneId: mediMs[0].id, submittedById: riya.id, status: 'approved', comments: 'Surveyed 3 clinics and 50 caregivers.', mentorComments: 'Approved by admin.', reviewedAt: daysFromNow(-70) },
  ]);

  // Documents with version history.
  const docs = [
    ['seed-agri-pitch-v1.pdf', 'AgriSense Pitch Deck', 'Pitch Deck', 1, ['Problem: water waste', 'Solution: soil sensors', 'Market: 120M farmers'], -110],
    ['seed-agri-pitch-v2.pdf', 'AgriSense Pitch Deck', 'Pitch Deck', 2, ['Updated traction: 40 paying pilots', '28% water saved', 'Ask: ₹5L seed grant'], -15],
    ['seed-agri-bplan.pdf', 'AgriSense Business Plan', 'Business Plan', 1, ['Unit economics', '3-year projections', 'Go-to-market via FPOs'], -30],
    ['seed-medi-pitch.pdf', 'MediTrack Pitch Deck', 'Pitch Deck', 1, ['Adherence problem', 'Smart pill box', 'Clinic partnerships'], -50],
  ];
  const created = {};
  for (const [file, title, category, version, lines, day] of docs) {
    const size = await writeSamplePdf(file, `${title} (v${version})`, lines);
    const startupId = file.includes('agri') ? agri.id : medi.id;
    created[file] = await Document.create({
      startupId, uploadedById: startupId === agri.id ? aarav.id : riya.id, fileName: title, originalName: file.replace('seed-', ''),
      fileType: 'pdf', category, filePath: file, size, version, uploadedAt: daysFromNow(day),
    });
  }

  const r1 = await MeetingRequest.create({ startupId: agri.id, mentorId: priya.id, requestedById: aarav.id, requestedDate: dateOnly(3), requestedTime: '16:30', agenda: 'Review customer testing report and plan revenue milestone', status: 'accepted' });
  await Meeting.create({ meetingRequestId: r1.id, startupId: agri.id, mentorId: priya.id, date: dateOnly(3), time: '16:30', agenda: r1.agenda, status: 'scheduled', location: 'https://meet.google.com/agr-snse-mtr' });
  // A session the mentor scheduled directly.
  await Meeting.create({ startupId: eats.id, mentorId: anita.id, date: dateOnly(5), time: '15:00', agenda: 'Go-to-market review before the canteen pilot', status: 'scheduled', scheduledBy: 'mentor', location: 'Innovation Lab, Desk 4' });
  const r2 = await MeetingRequest.create({ startupId: agri.id, mentorId: priya.id, requestedById: aarav.id, requestedDate: dateOnly(-20), requestedTime: '17:00', agenda: 'MVP demo', status: 'accepted' });
  await Meeting.create({ meetingRequestId: r2.id, startupId: agri.id, mentorId: priya.id, date: dateOnly(-20), time: '17:00', agenda: 'MVP demo', status: 'completed', notes: 'Demo went well; focus on onboarding UX.' });
  await MeetingRequest.create({ startupId: medi.id, mentorId: rahul.id, requestedById: riya.id, requestedDate: dateOnly(5), requestedTime: '18:00', agenda: 'Introduction and regulatory roadmap', status: 'pending' });
  await MeetingRequest.create({ startupId: eats.id, mentorId: anita.id, requestedById: kabir.id, requestedDate: dateOnly(2), requestedTime: '11:00', agenda: 'Go-to-market for hostel blocks', status: 'pending' });

  await Feedback.bulkCreate([
    { startupId: agri.id, mentorId: priya.id, rating: 4, comments: 'Excellent field validation. Tighten the unit economics before the next funding ask.', createdAt: daysFromNow(-38) },
    { startupId: agri.id, mentorId: priya.id, rating: 4, comments: 'Customer testing results look promising — prepare a case study with 2–3 farmers.', createdAt: daysFromNow(-2) },
    { startupId: eats.id, mentorId: anita.id, rating: 3, comments: 'Talk to at least 3 canteen owners about commission tolerance.', createdAt: daysFromNow(-20) },
  ]);
  eats.rating = 3;
  await eats.save();
  anita.rating = 3;
  await anita.save();

  // Investor module — AgriSense closed an angel round; MediTrack and CampusEats have open offers / meeting requests.
  await InvestmentInterest.bulkCreate([
    // Accepted and cleared by the Incubation Cell: this is AgriSense's secured finance.
    { investorId: vikram.id, startupId: agri.id, amount: 1000000, equity: 8, instrument: 'Equity', status: 'accepted', message: 'Impressive field traction. Happy to lead your pre-seed.', founderNote: 'Excited to partner with Sahyadri Angels!', respondedAt: daysFromNow(-25), createdAt: daysFromNow(-35), clearance: 'cleared', clearanceNote: 'Term sheet and investor KYC verified.', reviewedAt: daysFromNow(-24) },
    // Accepted by the founder, waiting for the Incubation Cell to clear it.
    { investorId: neha.id, startupId: eats.id, amount: 1500000, equity: 6, instrument: 'SAFE', status: 'accepted', message: 'Campus food is a great wedge. Happy to back the pilot.', founderNote: 'Thrilled to have Blue Lotus on board.', respondedAt: daysFromNow(-1), createdAt: daysFromNow(-6), clearance: 'under_review' },
    // Put on hold by the Incubation Cell until paperwork arrives.
    { investorId: neha.id, startupId: medi.id, amount: 1000000, instrument: 'Grant', status: 'accepted', message: 'A small grant to fund your clinic pilot.', founderNote: 'Thank you!', respondedAt: daysFromNow(-9), createdAt: daysFromNow(-14), clearance: 'on_hold', clearanceNote: 'Waiting for the signed grant agreement.', reviewedAt: daysFromNow(-7) },
    { investorId: vikram.id, startupId: medi.id, amount: 500000, equity: 10, instrument: 'Convertible Note', status: 'pending', message: 'We like the clinic-led distribution. Open to a convertible note with a 20% discount.', createdAt: daysFromNow(-3) },
    { investorId: neha.id, startupId: agri.id, amount: 2500000, equity: 15, instrument: 'Equity', status: 'declined', message: 'Interested in a larger round.', founderNote: 'Not raising at this valuation right now.', respondedAt: daysFromNow(-20), createdAt: daysFromNow(-28) },
  ]);
  await InvestorMeeting.bulkCreate([
    { investorId: vikram.id, startupId: medi.id, date: dateOnly(6), time: '17:30', kind: 'due_diligence', agenda: 'Discuss term sheet and clinic pilots', status: 'accepted', location: 'https://meet.google.com/med-trak-dd1' },
    // Founder-initiated pitch, waiting for the investor to respond.
    { investorId: neha.id, startupId: eats.id, date: dateOnly(4), time: '12:00', kind: 'pitch', awaiting: 'investor', askAmount: 1500000, agenda: 'Seed pitch: unit economics, campus expansion plan and use of funds', status: 'pending', location: 'Incubation Cell, Meeting Room 2' },
    // Investor-initiated intro, waiting for the founder.
    { investorId: neha.id, startupId: agri.id, date: dateOnly(8), time: '11:00', kind: 'intro', awaiting: 'founder', agenda: 'Intro call: exploring a follow-on round', status: 'pending', location: 'https://zoom.us/j/9988776655' },
    { investorId: vikram.id, startupId: agri.id, date: dateOnly(-30), time: '16:00', kind: 'pitch', askAmount: 1000000, deckId: created['seed-agri-pitch-v2.pdf'].id, agenda: 'Pre-seed pitch and Q&A', status: 'completed' },
  ]);

  const [pitch, hack, training] = await Workshop.bulkCreate([
    { createdById: kavita.id, title: 'Pitch Perfect: Storytelling for Founders', type: 'workshop', date: dateOnly(7), time: '15:00', venue: 'Seminar Hall A', capacity: 60, description: 'Craft a 3-minute investor pitch with live feedback.', status: 'upcoming' },
    { createdById: kavita.id, title: 'Build-a-thon 2026', type: 'hackathon', date: dateOnly(21), time: '09:00', venue: 'Innovation Lab', capacity: 120, description: '24-hour hackathon on climate and health problems.', status: 'upcoming' },
    { createdById: kavita.id, title: 'Financial Modelling Basics', type: 'training', date: dateOnly(-14), time: '14:00', venue: 'Room 301', capacity: 40, description: 'Unit economics, burn rate and runway.', status: 'completed' },
  ]);
  await WorkshopRegistration.bulkCreate([
    { workshopId: training.id, userId: aarav.id, attendanceStatus: 'present', registrationDate: daysFromNow(-20) },
    { workshopId: training.id, userId: riya.id, attendanceStatus: 'present', registrationDate: daysFromNow(-19) },
    { workshopId: training.id, userId: kabir.id, attendanceStatus: 'absent', registrationDate: daysFromNow(-18) },
    { workshopId: pitch.id, userId: aarav.id, registrationDate: daysFromNow(-1) },
    { workshopId: pitch.id, userId: meera.id, registrationDate: daysFromNow(-1) },
    { workshopId: hack.id, userId: kabir.id, registrationDate: daysFromNow(-2) },
  ]);

  await Notification.bulkCreate([
    { userId: aarav.id, type: 'investment', message: '✅ Transaction cleared: ₹10,00,000 from Vikram Malhotra (Sahyadri Angels) to AgriSense.', link: `/startups/${agri.id}?tab=investors`, isRead: true },
    { userId: aarav.id, type: 'meeting', message: `Meeting confirmed with Priya Sharma on ${humanSlot(dateOnly(3), '16:30')}`, link: '/meetings' },
    { userId: aarav.id, type: 'workshop', message: 'Your certificate for "Financial Modelling Basics" is ready to download.', link: '/workshops' },
    { userId: priyaU.id, type: 'milestone', message: 'AgriSense submitted "Customer Testing" for review', link: `/startups/${agri.id}?tab=milestones` },
    { userId: rahulU.id, type: 'mentor', message: 'You have been assigned to mentor "MediTrack". Please accept the assignment.', link: '/mentor/startups' },
    { userId: riya.id, type: 'investment', message: '⏸ Transaction on hold: ₹10,00,000 from Neha Kapoor (Blue Lotus Ventures) to MediTrack. Reason: Waiting for the signed grant agreement.', link: `/startups/${medi.id}?tab=investors` },
    { userId: meera.id, type: 'startup', message: 'Startup "FinFlow" has been rejected. Remarks: Business model needs clearer revenue path.', link: `/startups/${fin.id}` },
    { userId: riya.id, type: 'investment', message: '💼 Vikram Malhotra (Sahyadri Angels) is interested in investing ₹5,00,000 in MediTrack for 10% equity. Review the offer.', link: `/startups/${medi.id}?tab=investors` },
    { userId: kabir.id, type: 'investment', message: 'Neha Kapoor (Blue Lotus Ventures) requested an investor meeting for CampusEats.', link: `/startups/${eats.id}?tab=investors` },
    { userId: vikramU.id, type: 'investment', message: 'AgriSense accepted your offer of ₹10,00,000 🎉', link: '/investor/deals' },
  ]);

  console.log('Demo data loaded. Admin login: admin@isip.edu / Admin@123 · other users (students, mentors, investors): Password@123');
}

// `npm run seed` — reset and reseed.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDatabase({ reset: true })
    .then(() => sequelize.close())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
