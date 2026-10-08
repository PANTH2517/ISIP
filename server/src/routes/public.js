/**
 * Public, unauthenticated data for the portal home page: aggregate statistics, upcoming events,
 * the incubated-startup showcase and notices. Nothing personal is exposed — no emails, phones or drafts.
 */
import { Router } from 'express';
import { Op } from 'sequelize';
import { Startup, Workshop, Mentor, Investor, User, Role, InvestmentInterest } from '../models/index.js';
import { today } from '../utils/http.js';

const router = Router();

let cache = { at: 0, data: null };
const TTL = 60 * 1000; // public stats are cached for a minute

async function overview() {
  const activeUsers = (roleName) => User.count({ where: { status: 'active' }, include: [{ model: Role, as: 'role', where: { roleName }, attributes: [] }] });
  const [startups, incubated, mentors, investors, students, investments, workshopsHeld, upcoming, showcase, recentlyIncubated] = await Promise.all([
    Startup.count({ where: { status: { [Op.in]: ['pending', 'approved', 'incubated'] } } }),
    Startup.count({ where: { status: 'incubated' } }),
    activeUsers('mentor'),
    activeUsers('investor'),
    activeUsers('student'),
    InvestmentInterest.sum('amount', { where: { status: 'accepted', clearance: 'cleared' } }),
    Workshop.count({ where: { date: { [Op.lt]: today() }, status: { [Op.ne]: 'cancelled' } } }),
    Workshop.findAll({ where: { date: { [Op.gte]: today() }, status: 'upcoming' }, attributes: ['id', 'title', 'type', 'date', 'time', 'venue', 'description'], order: [['date', 'ASC']], limit: 5 }),
    Startup.findAll({ where: { status: { [Op.in]: ['incubated', 'approved'] } }, attributes: ['id', 'startupName', 'industry', 'description', 'status', 'progress'], order: [['status', 'DESC'], ['progress', 'DESC']], limit: 6 }),
    Startup.findAll({ where: { status: 'incubated' }, attributes: ['startupName', 'industry', 'updatedAt'], order: [['updatedAt', 'DESC']], limit: 3 }),
  ]);
  const industries = await Startup.findAll({ where: { status: { [Op.in]: ['approved', 'incubated'] } }, attributes: ['industry'] });

  // Upcoming events are listed separately, so the notice board carries announcements only.
  const notices = [
    ...recentlyIncubated.map((s) => ({ text: `${s.startupName} (${s.industry}) has been admitted to the incubation programme`, date: s.updatedAt.toISOString().slice(0, 10), isNew: true })),
    { text: 'Applications for the pre-incubation programme are open throughout the year — submit your idea on the portal.', date: null, isNew: false },
  ];

  return {
    stats: {
      startups,
      incubated,
      mentors,
      investors,
      students,
      financeCommitted: Number(investments || 0),
      workshopsHeld,
      industries: new Set(industries.map((s) => s.industry)).size,
    },
    upcomingEvents: upcoming,
    showcase,
    notices,
  };
}

router.get('/overview', async (req, res) => {
  if (!cache.data || Date.now() - cache.at > TTL) cache = { at: Date.now(), data: await overview() };
  res.json(cache.data);
});

export default router;
