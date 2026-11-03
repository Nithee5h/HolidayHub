import { connectDB, disconnectDB } from './src/config/db.js';
import { env } from './src/config/env.js';
import { createApp } from './src/app.js';
import { expireStaleHolds } from './src/services/bookingService.js';

try {
  await connectDB();
  console.log(`MongoDB connected (db: ${env.MONGODB_DB})`);
} catch (err) {
  console.error(`Could not connect to MongoDB: ${err.message}`);
  process.exit(1);
}

const server = createApp().listen(env.PORT, () => {
  console.log(`HolidayHub API listening on http://localhost:${env.PORT}/api`);
});

// Release seats held by unpaid bookings once their hold expires.
const holdSweep = setInterval(() => {
  expireStaleHolds().catch((err) => console.error(`Hold sweep failed: ${err.message}`));
}, 60 * 1000);
holdSweep.unref();

process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));

const shutdown = (signal) => {
  console.log(`${signal} received, closing server`);
  clearInterval(holdSweep);
  server.close(async () => {
    await disconnectDB().catch(() => {});
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
