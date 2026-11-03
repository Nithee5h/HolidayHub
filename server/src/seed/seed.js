import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { seedCatalog } from './seedCatalog.js';

/*
 * Usage:  npm run seed            # repeatable upsert
 *         npm run seed -- --reset # wipe catalog/bookings and reseed (dev only)
 */
const reset = process.argv.includes('--reset');

if (reset && env.isProduction) {
  console.error('Refusing to --reset in production.');
  process.exit(1);
}

try {
  await connectDB();
  const result = await seedCatalog({ reset });
  console.log(`Seeded ${result.packages} packages, created ${result.departuresCreated} departures${reset ? ' (after reset)' : ''}.`);
} catch (err) {
  console.error(`Seeding failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
