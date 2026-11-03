import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/index.js';
import { hashPassword } from '../services/authService.js';
import { passwordSchema } from '../validators/auth.js';
import { z } from 'zod';

/*
 * Create the first admin from environment variables (never from code or the
 * public API). Usage:
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run seed:admin            # create if missing
 *   npm run seed:admin -- --reset-password                        # also update the password
 */
const input = z
  .object({
    ADMIN_NAME: z.string().trim().min(2).max(80).default('HolidayHub Admin'),
    ADMIN_EMAIL: z.email('ADMIN_EMAIL must be a valid email').trim().toLowerCase(),
    ADMIN_PASSWORD: passwordSchema,
  })
  .safeParse(process.env);

if (!input.success) {
  console.error('Cannot create admin:\n' + input.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n'));
  process.exit(1);
}
const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = input.data;
if (/^replace-with|^admin@example\.com$/.test(ADMIN_PASSWORD) || ADMIN_EMAIL === 'admin@example.com') {
  console.error('Set real ADMIN_EMAIL / ADMIN_PASSWORD values in server/.env first (placeholders detected).');
  process.exit(1);
}

try {
  await connectDB();
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing && existing.role !== 'admin') {
    console.error(`${ADMIN_EMAIL} already belongs to a customer account; refusing to promote it automatically.`);
    process.exitCode = 1;
  } else if (existing) {
    if (process.argv.includes('--reset-password')) {
      existing.passwordHash = await hashPassword(ADMIN_PASSWORD);
      await existing.save();
      console.log(`Admin ${ADMIN_EMAIL} password updated.`);
    } else {
      console.log(`Admin ${ADMIN_EMAIL} already exists (use --reset-password to change the password).`);
    }
  } else {
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, passwordHash: await hashPassword(ADMIN_PASSWORD), role: 'admin' });
    console.log(`Admin ${ADMIN_EMAIL} created.`);
  }
} catch (err) {
  console.error(`Admin seed failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
