/** Module 1 — User Authentication: register, login, logout, forgot/reset password, email verification. */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { User, Role, Mentor, Investor, INVESTOR_TYPES } from '../models/index.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { sendMail } from '../services/mailer.js';
import { notify, adminIds } from '../services/notify.js';
import { HttpError, requireFields, pick } from '../utils/http.js';
import { randomToken } from '../utils/crypto.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false });
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_MSG = 'Password must be at least 8 characters and include a letter and a number';
// The (first) frontend address, for links in emails.
const clientUrl = () => (process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '');
// In development there is no mail server, so links are also returned to the UI for convenience.
const devExtra = (link) => (process.env.NODE_ENV === 'production' ? {} : { devLink: link });
// A production deployment without SMTP can't deliver verification emails, so new accounts are verified at
// sign-up instead (set SMTP_* to turn email verification on). Reset links are never exposed in production.
const autoVerify = () => process.env.NODE_ENV === 'production' && !process.env.SMTP_HOST;

export async function loadProfile(id) {
  return User.findByPk(id, { include: [{ model: Role, as: 'role' }, { model: Mentor, as: 'mentorProfile' }, { model: Investor, as: 'investorProfile' }] });
}

/** Adds https:// to bare links ("linkedin.com/in/x"); blank → null. */
export function normalizeUrl(v) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

/** Investor profile fields from a request body (amounts as numbers, blanks as null). */
export function investorFields(body) {
  const out = pick(body, ['firmName', 'focusIndustries', 'bio']);
  if (body.investorWebsite !== undefined) out.website = normalizeUrl(body.investorWebsite);
  if (body.investorType !== undefined) {
    if (!INVESTOR_TYPES.includes(body.investorType)) throw new HttpError(400, 'Invalid investor type');
    out.investorType = body.investorType;
  }
  for (const k of ['ticketMin', 'ticketMax']) if (body[k] !== undefined) out[k] = body[k] === '' || body[k] === null ? null : Number(body[k]);
  if (out.ticketMin && out.ticketMax && out.ticketMin > out.ticketMax) throw new HttpError(400, 'Minimum ticket size cannot exceed maximum');
  return out;
}

export function serializeUser(user) {
  const json = user.toJSON();
  return { ...json, role: user.role?.roleName };
}

router.post('/register', authLimiter, async (req, res) => {
  requireFields(req.body, ['name', 'email', 'password']);
  const { name, password, phone, role = 'student', expertise, bio, availability } = req.body;
  const email = String(req.body.email).trim().toLowerCase();
  if (!PASSWORD_RULE.test(password)) throw new HttpError(400, PASSWORD_MSG);
  if (!['student', 'mentor', 'investor'].includes(role)) throw new HttpError(400, 'You can register as a Student Entrepreneur, Mentor or Investor');
  if (await User.findOne({ where: { email } })) throw new HttpError(409, 'An account with this email already exists');

  const roleRow = await Role.findOne({ where: { roleName: role } });
  const verifyToken = autoVerify() ? null : randomToken();
  const user = await User.create({
    name: String(name).trim(), email, phone, password: await bcrypt.hash(password, 10), roleId: roleRow.id,
    ...(autoVerify() ? { status: 'active', emailVerified: true } : { status: 'pending', verifyToken }),
  });
  if (role === 'mentor') await Mentor.create({ userId: user.id, expertise, bio, availability: availability || 'Weekdays' });
  if (role === 'investor') await Investor.create({ userId: user.id, ...investorFields(req.body) });

  await notify(await adminIds(), { message: `New ${role} registered: ${user.name} (${email})`, type: 'info', link: '/admin/users' }, { email: false });
  if (autoVerify()) return res.status(201).json({ message: 'Registration successful. You can log in now.', verified: true });
  const link = `${clientUrl()}/verify-email?token=${verifyToken}`;
  sendMail(email, 'Verify your StartIn account', `Hi ${user.name},\n\nWelcome to StartIn! Please verify your email: ${link}`).catch(() => {});
  res.status(201).json({ message: 'Registration successful. Please check your email to verify your account.', ...devExtra(link) });
});

router.post('/verify-email', async (req, res) => {
  requireFields(req.body, ['token']);
  const user = await User.findOne({ where: { verifyToken: req.body.token } });
  if (!user) throw new HttpError(400, 'This verification link is invalid or has already been used');
  await user.update({ emailVerified: true, verifyToken: null, status: user.status === 'pending' ? 'active' : user.status });
  res.json({ message: 'Email verified successfully. You can now log in.' });
});

router.post('/resend-verification', authLimiter, async (req, res) => {
  requireFields(req.body, ['email']);
  const user = await User.findOne({ where: { email: String(req.body.email).trim().toLowerCase() } });
  let extra = {};
  if (user && !user.emailVerified) {
    const verifyToken = randomToken();
    await user.update({ verifyToken });
    const link = `${clientUrl()}/verify-email?token=${verifyToken}`;
    sendMail(user.email, 'Verify your StartIn account', `Verify your email: ${link}`).catch(() => {});
    extra = devExtra(link);
  }
  res.json({ message: 'If the account exists and is unverified, a new verification email has been sent.', ...extra });
});

router.post('/login', authLimiter, async (req, res) => {
  requireFields(req.body, ['email', 'password']);
  const user = await User.findOne({
    where: { email: String(req.body.email).trim().toLowerCase() },
    include: [{ model: Role, as: 'role' }, { model: Mentor, as: 'mentorProfile' }, { model: Investor, as: 'investorProfile' }],
  });
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) throw new HttpError(401, 'Invalid email or password');
  if (!user.emailVerified) throw new HttpError(403, 'Please verify your email before logging in', { needsVerification: true });
  if (user.status === 'inactive') throw new HttpError(403, 'Your account has been deactivated. Contact an administrator.');
  req.user = user;
  req.auditAction = 'Login';
  res.json({ token: signToken(user), user: serializeUser(user) });
});

router.post('/logout', authenticate, (req, res) => {
  req.auditAction = 'Logout';
  res.json({ message: 'Logged out' });
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  requireFields(req.body, ['email']);
  const user = await User.findOne({ where: { email: String(req.body.email).trim().toLowerCase() } });
  let extra = {};
  if (user) {
    const resetToken = randomToken();
    await user.update({ resetToken, resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) });
    const link = `${clientUrl()}/reset-password?token=${resetToken}`;
    sendMail(user.email, 'Reset your StartIn password', `Reset your password (valid for 1 hour): ${link}`).catch(() => {});
    extra = devExtra(link);
  }
  res.json({ message: 'If an account exists for that email, a password reset link has been sent.', ...extra });
});

router.post('/reset-password', async (req, res) => {
  requireFields(req.body, ['token', 'password']);
  if (!PASSWORD_RULE.test(req.body.password)) throw new HttpError(400, PASSWORD_MSG);
  const user = await User.findOne({ where: { resetToken: req.body.token } });
  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) throw new HttpError(400, 'This reset link is invalid or has expired');
  await user.update({ password: await bcrypt.hash(req.body.password, 10), resetToken: null, resetTokenExpires: null });
  res.json({ message: 'Password updated. You can now log in with your new password.' });
});

router.get('/me', authenticate, (req, res) => res.json(serializeUser(req.user)));

router.put('/profile', authenticate, async (req, res) => {
  const profile = pick(req.body, ['name', 'phone', 'headline', 'about', 'skills', 'linkedin', 'website']);
  for (const k of ['linkedin', 'website']) if (profile[k] !== undefined) profile[k] = normalizeUrl(profile[k]);
  await req.user.update(profile);
  if (req.role === 'mentor') {
    const profile = pick(req.body, ['expertise', 'bio', 'availability']);
    const mentor = req.user.mentorProfile || (await Mentor.create({ userId: req.user.id }));
    await mentor.update(profile);
  }
  if (req.role === 'investor') {
    const investor = req.user.investorProfile || (await Investor.create({ userId: req.user.id }));
    await investor.update(investorFields(req.body));
  }
  res.json(serializeUser(await loadProfile(req.user.id)));
});

router.put('/password', authenticate, async (req, res) => {
  requireFields(req.body, ['currentPassword', 'newPassword']);
  const user = await User.findByPk(req.user.id);
  if (!(await bcrypt.compare(req.body.currentPassword, user.password))) throw new HttpError(400, 'Current password is incorrect');
  if (!PASSWORD_RULE.test(req.body.newPassword)) throw new HttpError(400, PASSWORD_MSG);
  await user.update({ password: await bcrypt.hash(req.body.newPassword, 10) });
  res.json({ message: 'Password changed' });
});

export default router;
