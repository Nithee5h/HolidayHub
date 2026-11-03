import { z } from 'zod';
import { CATEGORIES, MAX_TRAVELLERS } from '../models/constants.js';
import { ISO_DATE } from '../utils/dates.js';

const optionalInt = (min, max) => z.coerce.number().int().min(min).max(max).optional();

export const SORTS = ['price-asc', 'price-desc', 'duration-asc', 'duration-desc'];
export const DURATIONS = { '1-3': [1, 3], '4-5': [4, 5], '6-': [6, Infinity] };

// Empty query values (e.g. `?category=`) mean "not set".
const withoutEmpty = (raw) => Object.fromEntries(Object.entries(raw ?? {}).filter(([, v]) => v !== ''));

export const listPackagesQuery = z
  .preprocess(
    withoutEmpty,
    z.object({
      destination: z.string().trim().max(80).optional(),
      category: z.enum(CATEGORIES).optional(),
      theme: z.string().trim().toLowerCase().max(30).optional(),
      minPrice: optionalInt(0, 10_000_000),
      maxPrice: optionalInt(0, 10_000_000),
      duration: z.enum(Object.keys(DURATIONS)).optional(),
      date: z.string().regex(ISO_DATE, 'date must be YYYY-MM-DD').optional(),
      travellers: optionalInt(1, MAX_TRAVELLERS),
      featured: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
      sort: z.enum(SORTS).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(12),
    }),
  )
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'minPrice cannot exceed maxPrice',
    path: ['minPrice'],
  });

export const idParam = z.object({ id: z.string().trim().min(1).max(100) });

export const relatedQuery = z.object({ limit: z.coerce.number().int().min(1).max(6).default(3) });
