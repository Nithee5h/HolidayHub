import { z } from 'zod';

export const contactBody = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: z.email('Please enter a valid email address').trim().toLowerCase().max(254),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000),
});
