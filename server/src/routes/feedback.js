/** Mentor feedback / suggestions and progress rating (Feedback class). */
import { Router } from 'express';
import { Feedback, Mentor, User, Startup } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { loadStartup, mentorFor } from '../services/access.js';
import { notify } from '../services/notify.js';
import { HttpError, requireFields } from '../utils/http.js';

const router = Router();
router.use(authenticate, authorize('student', 'mentor', 'admin'));

function parseRating(value) {
  if (value === undefined || value === null || value === '') return null;
  const r = Number(value);
  if (!Number.isInteger(r) || r < 1 || r > 5) throw new HttpError(400, 'Rating must be a whole number from 1 to 5');
  return r;
}

async function refreshRatings(startupId, mentorId) {
  const avg = async (where) => {
    const rows = await Feedback.findAll({ where, attributes: ['rating'] });
    const rated = rows.filter((r) => r.rating);
    return rated.length ? Math.round((rated.reduce((s, r) => s + r.rating, 0) / rated.length) * 10) / 10 : 0;
  };
  await Startup.update({ rating: await avg({ startupId }) }, { where: { id: startupId } });
  await Mentor.update({ rating: await avg({ mentorId }) }, { where: { id: mentorId } });
}

router.get('/', async (req, res) => {
  if (!req.query.startupId) throw new HttpError(400, 'startupId is required');
  const startup = await loadStartup(req, req.query.startupId);
  res.json(await Feedback.findAll({
    where: { startupId: startup.id },
    include: [{ model: Mentor, as: 'mentor', include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] }],
    order: [['createdAt', 'DESC']],
  }));
});

router.post('/', authorize('mentor'), async (req, res) => {
  requireFields(req.body, ['startupId', 'comments']);
  const startup = await loadStartup(req, req.body.startupId);
  const mentor = await mentorFor(req);
  const feedback = await Feedback.create({ startupId: startup.id, mentorId: mentor.id, comments: req.body.comments, rating: parseRating(req.body.rating) });
  await refreshRatings(startup.id, mentor.id);
  await notify(startup.createdById, { message: `${req.user.name} left feedback on ${startup.startupName}`, type: 'feedback', link: `/startups/${startup.id}?tab=feedback` });
  res.status(201).json(feedback);
});

router.put('/:id', authorize('mentor'), async (req, res) => {
  const mentor = await mentorFor(req);
  const feedback = await Feedback.findOne({ where: { id: req.params.id, mentorId: mentor.id } });
  if (!feedback) throw new HttpError(404, 'Feedback not found');
  await feedback.update({ comments: req.body.comments ?? feedback.comments, rating: req.body.rating !== undefined ? parseRating(req.body.rating) : feedback.rating });
  await refreshRatings(feedback.startupId, mentor.id);
  res.json(feedback);
});

export default router;
