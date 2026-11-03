import { z } from 'zod';

/* Password policy shared by registration and the admin seed. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt only uses the first 72 bytes
  .regex(/[a-z]/i, 'Password must include a letter')
  .regex(/\d/, 'Password must include a number');

const email = z.email('Please enter a valid email address').trim().toLowerCase().max(254);
const name = z.string().trim().min(2, 'Please enter your name').max(80);
const phoneNumber = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,20}$/, 'Please enter a valid phone number');
// Registration: blank means "not provided".
const phone = phoneNumber.optional().or(z.literal('').transform(() => undefined));
// Profile update: blank or null means "remove my phone number".
const phoneUpdate = z.preprocess((v) => (v === '' ? null : v), phoneNumber.nullable().optional());

// Unknown keys (e.g. a smuggled `role`) are stripped by zod objects.
export const registerBody = z.object({ name, email, phone, password: passwordSchema });

export const loginBody = z.object({
  email,
  password: z.string().min(1, 'Please enter your password').max(200),
});

export const updateProfileBody = z
  .object({ name: name.optional(), phone: phoneUpdate })
  .refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' });
