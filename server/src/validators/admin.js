import { z } from 'zod';
import { BOOKING_STATUSES, CATEGORIES, DEPARTURE_STATUSES, PACKAGE_STATUSES } from '../models/constants.js';
import { ISO_DATE } from '../utils/dates.js';

const objectId = z.string().trim().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const withoutEmpty = (raw) => Object.fromEntries(Object.entries(raw ?? {}).filter(([, v]) => v !== ''));
const page = z.coerce.number().int().min(1).default(1);

export const listUsersQuery = z.object({
  q: z.string().trim().max(80).optional(),
  page,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParam = z.object({ id: objectId });

/* ---------- Packages ---------- */
const text = (min, max, msg) => z.string().trim().min(min, msg).max(max);
const list = (max, itemMax) => z.array(z.string().trim().min(1).max(itemMax)).max(max);

export const packageBody = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens')
      .max(80)
      .optional(),
    title: text(3, 120, 'Title is required'),
    destination: text(2, 80, 'Destination is required'),
    country: text(2, 80, 'Country is required'),
    category: z.enum(CATEGORIES),
    durationDays: z.coerce.number().int().min(1).max(60),
    summary: text(10, 300, 'Summary must be at least 10 characters'),
    description: text(20, 4000, 'Description must be at least 20 characters'),
    basePrice: z.coerce.number().int().min(0).max(10_000_000),
    images: z
      .array(z.object({ url: z.url({ protocol: /^https$/, message: 'Image URL must start with https://' }), alt: text(3, 200, 'Describe the image') }))
      .min(1, 'Add at least one image')
      .max(12),
    itinerary: z
      .array(
        z.object({
          day: z.coerce.number().int().min(1),
          title: text(2, 120, 'Day title is required'),
          description: text(5, 1000, 'Describe the day'),
          activities: list(10, 80).default([]),
        }),
      )
      .min(1, 'Add at least one itinerary day'),
    inclusions: list(30, 120).default([]),
    exclusions: list(30, 120).default([]),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(10).default([]),
    featured: z.boolean().default(false),
    status: z.enum(PACKAGE_STATUSES).default('draft'),
  })
  .superRefine((p, ctx) => {
    if (p.itinerary.length > p.durationDays) {
      ctx.addIssue({ code: 'custom', path: ['itinerary'], message: `Itinerary has more days than the ${p.durationDays}-day duration` });
    }
    p.itinerary.forEach((d, i) => {
      if (d.day !== i + 1) ctx.addIssue({ code: 'custom', path: ['itinerary', i, 'day'], message: 'Days must be numbered 1, 2, 3…' });
    });
  });

export const listPackagesAdminQuery = z.preprocess(
  withoutEmpty,
  z.object({
    q: z.string().trim().max(80).optional(),
    status: z.enum(PACKAGE_STATUSES).optional(),
    page,
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
);

/* ---------- Departures ---------- */
export const createDepartureBody = z.object({
  packageId: objectId,
  startDate: z.string().regex(ISO_DATE, 'startDate must be YYYY-MM-DD'),
  pricePerPerson: z.coerce.number().int().min(0).max(10_000_000).nullable().optional(),
  capacity: z.coerce.number().int().min(1).max(500),
  status: z.enum(DEPARTURE_STATUSES).default('open'),
});

export const updateDepartureBody = z
  .object({
    startDate: z.string().regex(ISO_DATE, 'startDate must be YYYY-MM-DD').optional(),
    pricePerPerson: z.coerce.number().int().min(0).max(10_000_000).nullable().optional(),
    capacity: z.coerce.number().int().min(1).max(500).optional(),
    status: z.enum(DEPARTURE_STATUSES).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' });

export const listDeparturesQuery = z.object({ packageId: objectId });

/* ---------- Bookings ---------- */
export const listBookingsAdminQuery = z.preprocess(
  withoutEmpty,
  z
    .object({
      q: z.string().trim().max(80).optional(),
      status: z.enum(BOOKING_STATUSES).optional(),
      from: z.string().regex(ISO_DATE).optional(),
      to: z.string().regex(ISO_DATE).optional(),
      page,
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .refine((q) => !q.from || !q.to || q.from <= q.to, { message: '"from" must be before "to"', path: ['from'] }),
);

export const bookingStatusBody = z.object({ status: z.enum(['cancelled', 'completed']) });
