import 'dotenv/config';
import { sequelize, Role, User, Meeting, MeetingRequest, InvestorMeeting, InvestmentInterest, USER_PROFILE_COLUMNS } from './models/index.js';
import { sweepMeetings } from './services/meetingLifecycle.js';
import { seedDatabase } from './seed.js';
import app from './app.js';

const PORT = Number(process.env.PORT || 5000);

async function start() {
  await sequelize.authenticate();
  await sequelize.sync();
  // sync() doesn't add new columns to existing tables; add columns introduced after the first release.
  const qi = sequelize.getQueryInterface();
  for (const [model, columns] of [
    [User, USER_PROFILE_COLUMNS],
    [Meeting, ['checkedInAt', 'location', 'scheduledBy']],
    [MeetingRequest, ['location']],
    [InvestorMeeting, ['checkedInAt', 'kind', 'awaiting', 'askAmount', 'location', 'deckId']],
    [InvestmentInterest, ['clearance', 'clearanceNote', 'reviewedAt']],
  ]) {
    const existing = await qi.describeTable(model.getTableName());
    for (const col of columns) {
      if (!existing[col]) await qi.addColumn(model.getTableName(), col, model.getAttributes()[col]);
    }
  }
  // Deals accepted before the clearance step existed were already counted as finance; keep them cleared.
  await InvestmentInterest.update({ clearance: 'cleared' }, { where: { status: 'accepted', clearance: null } });
  if (!(await Role.count())) {
    console.log('Empty database detected — loading demo data...');
    await seedDatabase();
  }
  // Databases created before the investor module was added get the new role.
  await Role.findOrCreate({ where: { roleName: 'investor' }, defaults: { description: 'Investor — browses approved startups and makes investment offers' } });
  if (process.env.NODE_ENV === 'production' && !process.env.SMTP_HOST) {
    console.warn('⚠ SMTP_HOST is not set: verification and password-reset emails will only be printed to this log.');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.warn('⚠ JWT_SECRET is not set: using the insecure development secret.');
  }
  // Expire unconfirmed requests / mark no-show meetings as missed — once now, then every minute.
  await sweepMeetings({ force: true });
  setInterval(() => sweepMeetings({ force: true }).catch((err) => console.error('Meeting sweep failed:', err)), 60000);
  app.listen(PORT, () => {
    console.log(`StartIn ISIP API running on http://localhost:${PORT} (${sequelize.getDialect()})`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
