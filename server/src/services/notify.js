import { Op } from 'sequelize';
import { Notification, User, Role, Mentor, MentorAssignment } from '../models/index.js';
import { sendMail } from './mailer.js';

const SUBJECTS = {
  startup: 'Startup update',
  milestone: 'Milestone update',
  funding: 'Funding update',
  meeting: 'Meeting update',
  workshop: 'Workshop announcement',
  mentor: 'Mentor assignment',
  feedback: 'New mentor feedback',
  announcement: 'Announcement',
  investment: 'Investment update',
};

/**
 * Module 9 — creates dashboard notifications and sends matching emails (fire-and-forget).
 * @param {number|number[]} userIds
 */
export async function notify(userIds, { message, type = 'info', link = null }, { email = true } = {}) {
  const ids = [...new Set([].concat(userIds).filter(Boolean))];
  if (!ids.length) return;
  await Notification.bulkCreate(ids.map((userId) => ({ userId, message, type, link })));
  if (email) {
    const users = await User.findAll({ where: { id: ids }, attributes: ['id', 'email'] });
    for (const u of users) sendMail(u.email, `StartIn: ${SUBJECTS[type] || 'Notification'}`, message).catch(() => {});
  }
}

export async function userIdsWithRole(roleName) {
  const users = await User.findAll({
    attributes: ['id'],
    where: { status: 'active' },
    include: [{ model: Role, as: 'role', where: { roleName }, attributes: [] }],
  });
  return users.map((u) => u.id);
}

export const adminIds = () => userIdsWithRole('admin');

export async function mentorUserIdsForStartup(startupId) {
  const rows = await MentorAssignment.findAll({
    where: { startupId, status: { [Op.in]: ['assigned', 'accepted'] } },
    include: [{ model: Mentor, as: 'mentor', attributes: ['userId'] }],
  });
  return rows.map((r) => r.mentor.userId);
}
