import 'dotenv/config';
import './timezone.js';
import { sequelize, Role, User, Meeting, MeetingRequest, InvestorMeeting, InvestmentInterest, USER_PROFILE_COLUMNS } from './models/index.js';
import { sweepMeetings } from './services/meetingLifecycle.js';
import { seedDatabase, bootstrapProduction, ensureAdminFromEnv } from './seed.js';
import app from './app.js';

const PORT = Number(process.env.PORT || 5000);

/** A password-free summary of DATABASE_URL, to spot a wrong user, host or placeholder in the logs. */
export function describeDatabaseUrl(raw) {
  if (!raw) return 'DATABASE_URL is not set (using SQLite).';
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return 'DATABASE_URL is not a valid URL (check for spaces or unencoded special characters).';
  }
  const password = decodeURIComponent(u.password || '');
  const notes = [];
  if (!password) notes.push('no password');
  if (/[[\]]/.test(raw)) notes.push('contains [ or ] (placeholder brackets left in?)');
  if (/YOUR-PASSWORD/i.test(raw)) notes.push('still contains YOUR-PASSWORD');
  if (u.hostname.endsWith('pooler.supabase.com') && !u.username.includes('.')) notes.push('Supabase pooler needs the user "postgres.<project-ref>"');
  if (raw !== raw.trim()) notes.push('has leading/trailing spaces');
  return `Using user="${decodeURIComponent(u.username)}" host="${u.hostname}" port="${u.port || '5432'}" database="${u.pathname.slice(1)}" `
    + `password=${password.length} characters${notes.length ? `. Problems: ${notes.join('; ')}` : ''}.`;
}

async function start() {
  if (process.env.NODE_ENV === 'production') {
    const missing = ['JWT_SECRET', 'ENCRYPTION_KEY'].filter((k) => !process.env[k]);
    if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  try {
    await sequelize.authenticate();
  } catch (err) {
    console.error(`Database connection failed. ${describeDatabaseUrl(process.env.DATABASE_URL)}`);
    throw err;
  }
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
  const production = process.env.NODE_ENV === 'production';
  if (!(await Role.count())) {
    // Demo data has well-known passwords, so production only loads it when asked to, with DEMO_PASSWORD set.
    const demoInProduction = process.env.SEED_DEMO === 'true' && Boolean(process.env.DEMO_PASSWORD);
    if (production && process.env.SEED_DEMO === 'true' && !demoInProduction) console.warn('⚠ SEED_DEMO is on but DEMO_PASSWORD is not set: skipping demo data.');
    if (production && !demoInProduction) {
      console.log('Empty database detected — creating roles.');
      await bootstrapProduction();
    } else {
      console.log('Empty database detected — loading demo data...');
      await seedDatabase();
    }
  }
  await ensureAdminFromEnv();
  if (production && !process.env.ADMIN_EMAIL) {
    console.warn('⚠ ADMIN_EMAIL / ADMIN_PASSWORD are not set: no administrator account will be created.');
  }
  // Databases created before the investor module was added get the new role.
  await Role.findOrCreate({ where: { roleName: 'investor' }, defaults: { description: 'Investor — browses approved startups and makes investment offers' } });
  if (process.env.NODE_ENV === 'production' && !process.env.SMTP_HOST) {
    console.warn('⚠ SMTP_HOST is not set: new accounts are verified automatically and password-reset emails are only printed to this log.');
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
