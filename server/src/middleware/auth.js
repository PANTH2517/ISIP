import jwt from 'jsonwebtoken';
import { User, Role, Mentor, Investor } from '../models/index.js';

export const JWT_SECRET = () => process.env.JWT_SECRET || 'isip-dev-jwt-secret';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role.roleName }, JWT_SECRET(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

/** Verifies the Bearer JWT and loads the user (with role and mentor profile) onto req. */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET());
    const user = await User.findByPk(payload.id, {
      include: [{ model: Role, as: 'role' }, { model: Mentor, as: 'mentorProfile' }, { model: Investor, as: 'investorProfile' }],
    });
    if (!user || user.status === 'inactive') return res.status(401).json({ message: 'Account is not active' });
    req.user = user;
    req.role = user.role.roleName;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired, please log in again' });
  }
}

/** Role-based access control. */
export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.role) ? next() : res.status(403).json({ message: 'You do not have permission to perform this action' });
