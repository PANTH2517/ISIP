/** Admin — Manage Users (role changes, activation, creating mentor/admin accounts). */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User, Role, Mentor, Investor } from '../models/index.js';
import { likeOp } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { notify } from '../services/notify.js';
import { HttpError, requireFields } from '../utils/http.js';
import { serializeUser, loadProfile, investorFields } from './auth.js';

const router = Router();
router.use(authenticate, authorize('admin'));

const ROLES = ['student', 'mentor', 'investor', 'admin'];

router.get('/', async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) where.name = { [likeOp]: `%${req.query.search}%` };
  const roleWhere = req.query.role ? { roleName: req.query.role } : undefined;
  const users = await User.findAll({
    where,
    include: [{ model: Role, as: 'role', where: roleWhere }, { model: Mentor, as: 'mentorProfile' }, { model: Investor, as: 'investorProfile' }],
    order: [['createdAt', 'DESC']],
  });
  res.json(users.map(serializeUser));
});

router.post('/', async (req, res) => {
  requireFields(req.body, ['name', 'email', 'password', 'role']);
  if (!ROLES.includes(req.body.role)) throw new HttpError(400, 'Invalid role');
  const email = String(req.body.email).trim().toLowerCase();
  if (await User.findOne({ where: { email } })) throw new HttpError(409, 'An account with this email already exists');
  const role = await Role.findOne({ where: { roleName: req.body.role } });
  const user = await User.create({
    name: req.body.name, email, phone: req.body.phone, roleId: role.id, status: 'active', emailVerified: true,
    password: await bcrypt.hash(req.body.password, 10),
  });
  if (req.body.role === 'mentor') await Mentor.create({ userId: user.id, expertise: req.body.expertise, bio: req.body.bio, availability: 'Weekdays' });
  if (req.body.role === 'investor') await Investor.create({ userId: user.id, ...investorFields(req.body) });
  res.status(201).json(serializeUser(await loadProfile(user.id)));
});

router.patch('/:id', async (req, res) => {
  const user = await loadProfile(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (user.id === req.user.id) throw new HttpError(400, 'You cannot change your own role or status');
  const changes = {};
  if (req.body.status) {
    if (!['active', 'inactive', 'pending'].includes(req.body.status)) throw new HttpError(400, 'Invalid status');
    changes.status = req.body.status;
    if (req.body.status === 'active') changes.emailVerified = true;
  }
  if (req.body.role) {
    if (!ROLES.includes(req.body.role)) throw new HttpError(400, 'Invalid role');
    changes.roleId = (await Role.findOne({ where: { roleName: req.body.role } })).id;
    if (req.body.role === 'mentor' && !user.mentorProfile) await Mentor.create({ userId: user.id, availability: 'Weekdays' });
    if (req.body.role === 'investor' && !user.investorProfile) await Investor.create({ userId: user.id });
  }
  await user.update(changes);
  if (changes.roleId) await notify(user.id, { message: `Your role has been changed to ${req.body.role}.`, type: 'info' }, { email: false });
  res.json(serializeUser(await loadProfile(user.id)));
});

export default router;
