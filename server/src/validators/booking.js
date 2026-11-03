import { z } from 'zod';
import { MAX_TRAVELLERS } from '../models/constants.js';

const objectId = z.string().trim().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const quoteBody = z.object({
  departureId: objectId,
  travellerCount: z.coerce.number().int().min(1).max(MAX_TRAVELLERS),
});

export const createBookingBody = z.object({
  departureId: objectId,
  travellers: z
    .array(
      z.object({
        name: z.string().trim().min(2, 'Enter the traveller’s full name').max(80),
        age: z.coerce.number().int().min(0).max(120).optional(),
      }),
    )
    .min(1, 'Add at least one traveller')
    .max(MAX_TRAVELLERS, `At most ${MAX_TRAVELLERS} travellers per booking`),
  // Client-generated per checkout attempt; retries with the same key are safe.
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
});

export const myBookingsQuery = z.object({ tab: z.enum(['upcoming', 'completed', 'cancelled']).optional() });

export const bookingIdParam = z.object({ id: z.string().trim().min(1).max(100) });

export const demoPaymentBody = z.object({
  bookingId: objectId,
  // Lets the demo show a declined payment. No card data is ever accepted.
  outcome: z.enum(['success', 'decline']).default('success'),
});
