/**
 * All date rules (no booking in the past, check-in windows, expiring requests, report dates) use the server clock.
 * Hosting providers run in UTC, so pin the app to its users' time zone. Import this before anything else.
 */
process.env.TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata'; // hosts often set TZ=UTC, so only APP_TIMEZONE overrides
