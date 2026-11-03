import mongoose from 'mongoose';
import { Departure, Package } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { addDays, dateFromIso, todayIso } from '../utils/dates.js';
import { DURATIONS } from '../validators/catalog.js';

/** A departure matching the requested date counts if it starts within this many days of it. */
export const DATE_WINDOW_DAYS = 30;

const SORT_SPECS = {
  'price-asc': { basePrice: 1, _id: 1 },
  'price-desc': { basePrice: -1, _id: 1 },
  'duration-asc': { durationDays: 1, _id: 1 },
  'duration-desc': { durationDays: -1, _id: 1 },
};
const DEFAULT_SORT = { featured: -1, _id: 1 };

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Mongo filter for departures customers can book now. */
export function bookableDepartureFilter({ travellers = 1, date } = {}, today = todayIso()) {
  const startDate = { $gt: dateFromIso(today) };
  if (date) {
    startDate.$gte = dateFromIso(date);
    startDate.$lte = dateFromIso(addDays(date, DATE_WINDOW_DAYS));
  }
  return { status: 'open', seatsRemaining: { $gte: travellers }, startDate };
}

/** Upcoming open departures (incl. sold out) per package, soonest first. */
async function upcomingDeparturesByPackage(packageIds, today = todayIso()) {
  const rows = await Departure.find({ packageId: { $in: packageIds }, status: 'open', startDate: { $gt: dateFromIso(today) } }).sort({
    startDate: 1,
  });
  const grouped = new Map();
  rows.forEach((d) => {
    const key = String(d.packageId);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(d);
  });
  return grouped;
}

/** Attach { upcomingCount, next } — the next departure with seats for the party. */
async function withDepartureSummaries(packages, travellers = 1) {
  const grouped = await upcomingDeparturesByPackage(packages.map((p) => p._id));
  return packages.map((p) => {
    const upcoming = grouped.get(String(p._id)) ?? [];
    const next = upcoming.find((d) => d.seatsRemaining >= travellers);
    return { ...p.toJSON(), departureSummary: { upcomingCount: upcoming.length, next: next ? next.toJSON() : null } };
  });
}

/** GET /packages — search, filter, sort, paginate published packages. */
export async function listPackages(q) {
  const filter = { status: 'published' };

  if (q.destination) {
    const re = new RegExp(escapeRegex(q.destination), 'i');
    filter.$or = [{ destination: re }, { country: re }, { title: re }];
  }
  if (q.category) filter.category = q.category;
  if (q.theme) filter.tags = q.theme;
  if (q.featured !== undefined) filter.featured = q.featured;
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    filter.basePrice = {};
    if (q.minPrice !== undefined) filter.basePrice.$gte = q.minPrice;
    if (q.maxPrice !== undefined) filter.basePrice.$lte = q.maxPrice;
  }
  if (q.duration) {
    const [min, max] = DURATIONS[q.duration];
    filter.durationDays = Number.isFinite(max) ? { $gte: min, $lte: max } : { $gte: min };
  }
  // A date or party size means "only packages I could actually book".
  if (q.date || q.travellers) {
    const ids = await Departure.distinct('packageId', bookableDepartureFilter({ travellers: q.travellers ?? 1, date: q.date }));
    filter._id = { $in: ids };
  }

  const page = q.page ?? 1;
  const limit = q.limit ?? 12;
  const [total, docs] = await Promise.all([
    Package.countDocuments(filter),
    Package.find(filter)
      .sort(SORT_SPECS[q.sort] ?? DEFAULT_SORT)
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  return {
    items: await withDepartureSummaries(docs, q.travellers ?? 1),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** Find a published package by ObjectId or slug. */
export async function getPublishedPackage(idOrSlug) {
  const filter = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };
  const pkg = await Package.findOne({ ...filter, status: 'published' });
  if (!pkg) throw ApiError.notFound('Package not found');
  return pkg;
}

/** GET /packages/:id/departures — upcoming open departures, including sold out. */
export async function getPackageDepartures(idOrSlug) {
  const pkg = await getPublishedPackage(idOrSlug);
  const grouped = await upcomingDeparturesByPackage([pkg._id]);
  return (grouped.get(String(pkg._id)) ?? []).map((d) => d.toJSON());
}

/** GET /departures/:id — a departure with its (published) package. */
export async function getDepartureWithPackage(id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Departure not found');
  const departure = await Departure.findById(id);
  const pkg = departure && (await Package.findOne({ _id: departure.packageId, status: 'published' }));
  if (!departure || !pkg) throw ApiError.notFound('Departure not found');
  return { departure: departure.toJSON(), package: pkg.toJSON() };
}

/** GET /packages/:id/related — same destination first, then same category. */
export async function getRelatedPackages(idOrSlug, limit = 3) {
  const pkg = await getPublishedPackage(idOrSlug);
  const candidates = await Package.find({
    _id: { $ne: pkg._id },
    status: 'published',
    $or: [{ destination: pkg.destination }, { category: pkg.category }],
  });
  const score = (p) => (p.destination === pkg.destination ? 2 : 0) + (p.category === pkg.category ? 1 : 0);
  const top = candidates.sort((a, b) => score(b) - score(a) || String(a._id).localeCompare(String(b._id))).slice(0, limit);
  return withDepartureSummaries(top);
}

/** GET /packages/facets — counts used by homepage/destination pages. */
export async function getFacets() {
  const [result] = await Package.aggregate([
    { $match: { status: 'published' } },
    {
      $facet: {
        destinations: [
          { $group: { _id: '$destination', count: { $sum: 1 }, minPrice: { $min: '$basePrice' } } },
          { $project: { _id: 0, name: '$_id', count: 1, minPrice: 1 } },
          { $sort: { name: 1 } },
        ],
        categories: [{ $group: { _id: '$category', count: { $sum: 1 } } }, { $project: { _id: 0, name: '$_id', count: 1 } }, { $sort: { name: 1 } }],
        themes: [
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $project: { _id: 0, name: '$_id', count: 1 } },
          { $sort: { name: 1 } },
        ],
      },
    },
  ]);
  return result;
}
