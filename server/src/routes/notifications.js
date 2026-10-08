/** Module 9 — Notifications (dashboard alerts + announcements). */
import { Router } from 'express';
import { Notification } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { notify, userIdsWithRole } from '../services/notify.js';
import { HttpError, requireFields } from '../utils/http.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const where = { userId: req.user.id };
  if (req.query.unread === 'true') where.isRead = false;
  const [items, unread] = await Promise.all([
    Notification.findAll({ where, order: [['createdAt', 'DESC']], limit: Number(req.query.limit) || 100 }),
    Notification.count({ where: { userId: req.user.id, isRead: false } }),
  ]);
  res.json({ items, unread });
});

router.patch('/read-all', async (req, res) => {
  await Notification.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } });
  res.json({ message: 'All notifications marked as read' });
});

router.patch('/:id/read', async (req, res) => {
  const [count] = await Notification.update({ isRead: true }, { where: { id: req.params.id, userId: req.user.id } });
  if (!count) throw new HttpError(404, 'Notification not found');
  res.json({ message: 'Marked as read' });
});

router.post('/announce', authorize('admin'), async (req, res) => {
  requireFields(req.body, ['message']);
  const audience = req.body.audience || 'all';
  let ids;
  if (audience === 'all') ids = [...(await userIdsWithRole('student')), ...(await userIdsWithRole('mentor')), ...(await userIdsWithRole('investor'))];
  else if (['student', 'mentor', 'investor'].includes(audience)) ids = await userIdsWithRole(audience);
  else throw new HttpError(400, 'Audience must be all, student, mentor or investor');
  await notify(ids, { message: `📢 ${req.body.message}`, type: 'announcement' }, { email: req.body.email !== false });
  res.status(201).json({ message: `Announcement sent to ${ids.length} user(s)` });
});

export default router;
