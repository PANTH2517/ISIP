/** Module 8 — Workshop Management (for student entrepreneurs; run by the admin): events, registration, attendance, certificates. */
import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { Workshop, WorkshopRegistration, User, Role } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { notify, userIdsWithRole } from '../services/notify.js';
import { HttpError, requireFields, pick, today, humanDate } from '../utils/http.js';

const router = Router();
router.use(authenticate, authorize('student', 'admin'));

const FIELDS = ['title', 'description', 'date', 'time', 'venue', 'type', 'capacity'];

router.get('/', async (req, res) => {
  const workshops = await Workshop.findAll({
    include: [{ model: WorkshopRegistration, as: 'registrations', attributes: ['id', 'userId', 'attendanceStatus'] }],
    order: [['date', 'DESC']],
  });
  res.json(workshops.map((w) => {
    const json = w.toJSON();
    const mine = json.registrations.find((r) => r.userId === req.user.id) || null;
    return {
      ...json,
      registrations: undefined,
      registeredCount: json.registrations.length,
      attendedCount: json.registrations.filter((r) => r.attendanceStatus === 'present').length,
      myRegistration: mine,
    };
  }));
});

router.post('/', authorize('admin'), async (req, res) => {
  requireFields(req.body, ['title', 'date', 'type']);
  const data = pick(req.body, FIELDS);
  if (data.capacity === '') data.capacity = null;
  const workshop = await Workshop.create({ ...data, createdById: req.user.id });
  const audience = await userIdsWithRole('student');
  await notify(audience, { message: `New ${workshop.type} announced: "${workshop.title}" on ${humanDate(workshop.date)}${workshop.venue ? ` at ${workshop.venue}` : ''}`, type: 'workshop', link: '/workshops' });
  res.status(201).json(workshop);
});

router.put('/:id', authorize('admin'), async (req, res) => {
  const workshop = await Workshop.findByPk(req.params.id);
  if (!workshop) throw new HttpError(404, 'Workshop not found');
  const data = pick(req.body, [...FIELDS, 'status']);
  if (data.capacity === '') data.capacity = null;
  res.json(await workshop.update(data));
});

router.patch('/:id/cancel', authorize('admin'), async (req, res) => {
  const workshop = await Workshop.findByPk(req.params.id, { include: [{ model: WorkshopRegistration, as: 'registrations' }] });
  if (!workshop) throw new HttpError(404, 'Workshop not found');
  await workshop.update({ status: 'cancelled' });
  await notify(workshop.registrations.map((r) => r.userId), { message: `"${workshop.title}" scheduled for ${humanDate(workshop.date)} has been cancelled.`, type: 'workshop', link: '/workshops' });
  res.json(workshop);
});

router.post('/:id/register', authorize('student'), async (req, res) => {
  const workshop = await Workshop.findByPk(req.params.id);
  if (!workshop) throw new HttpError(404, 'Workshop not found');
  if (workshop.status !== 'upcoming' || workshop.date < today()) throw new HttpError(400, 'Registration is closed for this event');
  if (await WorkshopRegistration.findOne({ where: { workshopId: workshop.id, userId: req.user.id } })) throw new HttpError(409, 'You are already registered');
  if (workshop.capacity && (await WorkshopRegistration.count({ where: { workshopId: workshop.id } })) >= workshop.capacity) {
    throw new HttpError(400, 'This event is full');
  }
  const reg = await WorkshopRegistration.create({ workshopId: workshop.id, userId: req.user.id });
  await notify(req.user.id, { message: `You're registered for "${workshop.title}" on ${humanDate(workshop.date)}.`, type: 'workshop', link: '/workshops' });
  res.status(201).json(reg);
});

router.delete('/:id/register', authorize('student'), async (req, res) => {
  const reg = await WorkshopRegistration.findOne({ where: { workshopId: req.params.id, userId: req.user.id } });
  if (!reg) throw new HttpError(404, 'You are not registered for this event');
  if (reg.attendanceStatus !== 'registered') throw new HttpError(400, 'Attendance has already been recorded');
  await reg.destroy();
  res.json({ message: 'Registration cancelled' });
});

router.get('/:id/registrations', authorize('admin'), async (req, res) => {
  res.json(await WorkshopRegistration.findAll({
    where: { workshopId: req.params.id },
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], include: [{ model: Role, as: 'role', attributes: ['roleName'] }] }],
    order: [['registrationDate', 'ASC']],
  }));
});

router.patch('/registrations/:rid/attendance', authorize('admin'), async (req, res) => {
  if (!['present', 'absent', 'registered'].includes(req.body.attendanceStatus)) throw new HttpError(400, 'Invalid attendance status');
  const reg = await WorkshopRegistration.findByPk(req.params.rid, { include: [{ model: Workshop, as: 'workshop' }] });
  if (!reg) throw new HttpError(404, 'Registration not found');
  if (req.body.attendanceStatus !== 'registered' && reg.workshop.date > today()) {
    throw new HttpError(400, `Attendance can be marked from the event date (${humanDate(reg.workshop.date)})`);
  }
  const firstTimePresent = reg.attendanceStatus !== 'present' && req.body.attendanceStatus === 'present';
  await reg.update({ attendanceStatus: req.body.attendanceStatus });
  if (firstTimePresent) {
    await notify(reg.userId, { message: `Your certificate for "${reg.workshop.title}" is ready to download.`, type: 'workshop', link: '/workshops' }, { email: false });
  }
  res.json(reg);
});

router.get('/registrations/:rid/certificate', async (req, res) => {
  const reg = await WorkshopRegistration.findByPk(req.params.rid, {
    include: [{ model: Workshop, as: 'workshop' }, { model: User, as: 'user', attributes: ['id', 'name'] }],
  });
  if (!reg) throw new HttpError(404, 'Registration not found');
  if (req.role !== 'admin' && reg.userId !== req.user.id) throw new HttpError(403, 'Not your certificate');
  if (reg.attendanceStatus !== 'present') throw new HttpError(400, 'Certificates are issued only to attendees');

  const { workshop, user } = reg;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="certificate-${workshop.id}-${user.id}.pdf"`);
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
  doc.pipe(res);
  const { width, height } = doc.page;
  doc.rect(20, 20, width - 40, height - 40).lineWidth(4).stroke('#4f46e5');
  doc.rect(32, 32, width - 64, height - 64).lineWidth(1).stroke('#a5b4fc');
  doc.moveDown(2).fillColor('#4f46e5').fontSize(16).text('StartIn · Intelligent Startup Incubation Platform', { align: 'center' });
  doc.moveDown(1).fillColor('#111827').fontSize(38).text('Certificate of Participation', { align: 'center' });
  doc.moveDown(1).fontSize(16).fillColor('#374151').text('This is to certify that', { align: 'center' });
  doc.moveDown(0.6).fontSize(30).fillColor('#111827').text(user.name, { align: 'center' });
  doc.moveDown(0.6).fontSize(16).fillColor('#374151')
    .text(`has successfully participated in the ${workshop.type} "${workshop.title}"`, { align: 'center' })
    .text(`held on ${humanDate(workshop.date)}${workshop.venue ? ` at ${workshop.venue}` : ''}.`, { align: 'center' });
  doc.fontSize(11).fillColor('#6b7280').text(`Certificate ID: ISIP-${workshop.id}-${reg.id}  ·  Issued ${today()}`, 50, height - 90, { align: 'center', width: width - 100 });
  doc.end();
});

export default router;
