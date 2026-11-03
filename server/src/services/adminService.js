import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Booking, Departure, Package, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { addDays, dateFromIso, isoFromDate, todayIso } from '../utils/dates.js';
import { cancelBooking, expireStaleHolds, presentBooking } from './bookingService.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ACTIVE = ['pending', 'confirmed'];
const paginate = (total, page, limit) => ({ total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/* ------------------------------------------------------------------ stats */

function lastMonths(count) {
  const [y, m] = todayIso().split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

/** GET /admin/stats — aggregate metrics; revenue is simulated (demo payments). */
export async function getStats() {
  await expireStaleHolds();
  const months = lastMonths(6);
  const since = dateFromIso(`${months[0]}-01`);

  const [packagesByStatus, bookingsByStatus, customers, revenueAgg, monthly, destinations, upcomingDepartures, recent] = await Promise.all([
    Package.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.aggregate([{ $group: { _id: '$bookingStatus', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'customer' }),
    Booking.aggregate([
      { $match: { paymentStatus: 'paid_demo' } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, travellers: { $sum: '$travellerCount' } } },
    ]),
    Booking.aggregate([
      { $match: { paymentStatus: 'paid_demo', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: env.APP_TIMEZONE } },
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { bookingStatus: { $ne: 'cancelled' } } },
      { $group: { _id: '$destination', bookings: { $sum: 1 }, travellers: { $sum: '$travellerCount' } } },
      { $sort: { bookings: -1, _id: 1 } },
      { $limit: 6 },
    ]),
    Departure.countDocuments({ status: 'open', startDate: { $gt: dateFromIso(todayIso()) } }),
    Booking.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'name email'),
  ]);

  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const byMonth = Object.fromEntries(monthly.map((r) => [r._id, r]));
  const bookingCounts = toMap(bookingsByStatus);

  return {
    packages: { total: Object.values(toMap(packagesByStatus)).reduce((a, b) => a + b, 0), ...toMap(packagesByStatus) },
    bookings: { total: Object.values(bookingCounts).reduce((a, b) => a + b, 0), ...bookingCounts },
    customers,
    upcomingDepartures,
    revenueDemo: revenueAgg[0]?.revenue ?? 0,
    travellersPaid: revenueAgg[0]?.travellers ?? 0,
    monthly: months.map((month) => ({ month, bookings: byMonth[month]?.bookings ?? 0, revenue: byMonth[month]?.revenue ?? 0 })),
    topDestinations: destinations.map((d) => ({ destination: d._id, bookings: d.bookings, travellers: d.travellers })),
    recentBookings: recent.map((b) => ({
      id: b.id,
      reference: b.reference,
      packageTitle: b.packageTitle,
      customer: b.userId ? { name: b.userId.name, email: b.userId.email } : null,
      bookingStatus: b.bookingStatus,
      paymentStatus: b.paymentStatus,
      totalAmount: b.totalAmount,
      createdAt: b.createdAt,
    })),
  };
}

/* --------------------------------------------------------------- packages */

/** Departure + active-booking counts per package id. */
async function packageCounts(ids) {
  const [deps, books] = await Promise.all([
    Departure.aggregate([{ $match: { packageId: { $in: ids } } }, { $group: { _id: '$packageId', count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { packageId: { $in: ids }, bookingStatus: { $in: ACTIVE } } }, { $group: { _id: '$packageId', count: { $sum: 1 } } }]),
  ]);
  const map = (rows) => new Map(rows.map((r) => [String(r._id), r.count]));
  return { departures: map(deps), bookings: map(books) };
}

export async function listPackagesAdmin({ q, status, page, limit }) {
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: re }, { destination: re }, { slug: re }];
  }
  const [total, docs] = await Promise.all([
    Package.countDocuments(filter),
    Package.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  const counts = await packageCounts(docs.map((d) => d._id));
  const items = docs.map((d) => ({
    ...d.toJSON(),
    departureCount: counts.departures.get(d.id) ?? 0,
    activeBookings: counts.bookings.get(d.id) ?? 0,
  }));
  return { items, ...paginate(total, page, limit) };
}

export async function getPackageAdmin(id) {
  const pkg = await Package.findById(id);
  if (!pkg) throw ApiError.notFound('Package not found');
  return pkg;
}

export async function createPackage(body) {
  const slug = body.slug || slugify(`${body.title}`);
  if (!slug) throw ApiError.badRequest('Validation failed', [{ field: 'slug', message: 'Could not derive a slug from the title' }]);
  if (await Package.exists({ slug })) {
    throw new ApiError(409, 'A package with this slug already exists', [{ field: 'slug', message: 'This slug is already used' }]);
  }
  return Package.create({ ...body, slug });
}

/** Full update. The slug is fixed after creation so existing links and booking history keep working. */
export async function updatePackage(id, body) {
  const pkg = await getPackageAdmin(id);
  const { slug: _ignored, ...rest } = body;
  pkg.set(rest);
  await pkg.save();
  return pkg;
}

/** DELETE: archive when bookings reference the package; otherwise remove it and its departures. */
export async function removePackage(id) {
  const pkg = await getPackageAdmin(id);
  if (await Booking.exists({ packageId: pkg._id })) {
    pkg.status = 'archived';
    await pkg.save();
    return { archived: true, package: pkg.toJSON() };
  }
  await Departure.deleteMany({ packageId: pkg._id });
  await pkg.deleteOne();
  return { deleted: true, id: pkg.id };
}

/* ------------------------------------------------------------- departures */

async function activeBookingStats(departureIds) {
  const rows = await Booking.aggregate([
    { $match: { departureId: { $in: departureIds }, bookingStatus: { $in: ACTIVE } } },
    { $group: { _id: '$departureId', bookings: { $sum: 1 }, travellers: { $sum: '$travellerCount' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

const presentDeparture = (d, stats) => ({
  ...d.toJSON(),
  bookedSeats: d.capacity - d.seatsRemaining,
  activeBookings: stats.get(d.id)?.bookings ?? 0,
});

export async function listDepartures(packageId) {
  await getPackageAdmin(packageId);
  await expireStaleHolds();
  const deps = await Departure.find({ packageId }).sort({ startDate: 1 });
  const stats = await activeBookingStats(deps.map((d) => d._id));
  return deps.map((d) => presentDeparture(d, stats));
}

function assertFutureDate(iso) {
  if (iso <= todayIso()) {
    throw ApiError.badRequest('Validation failed', [{ field: 'startDate', message: 'Departure date must be in the future' }]);
  }
}

export async function createDeparture({ packageId, startDate, pricePerPerson, capacity, status }) {
  const pkg = await getPackageAdmin(packageId);
  if (pkg.status === 'archived') throw new ApiError(409, 'Archived packages cannot get new departures');
  assertFutureDate(startDate);
  const dep = await Departure.create({
    packageId: pkg._id,
    startDate: dateFromIso(startDate),
    endDate: dateFromIso(addDays(startDate, pkg.durationDays - 1)),
    ...(pricePerPerson != null ? { pricePerPerson } : {}),
    capacity,
    seatsRemaining: capacity,
    status,
  });
  return presentDeparture(dep, new Map());
}

/**
 * PUT /admin/departures/:id. Capacity changes keep already-booked seats:
 * new seatsRemaining = newCapacity − booked, applied atomically and only if
 * newCapacity ≥ booked at that instant (safe against concurrent bookings).
 * Date changes and cancellation are refused while active bookings exist.
 */
export async function updateDeparture(id, body) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Departure not found');
  await expireStaleHolds();
  const dep = await Departure.findById(id);
  if (!dep) throw ApiError.notFound('Departure not found');
  const pkg = await Package.findById(dep.packageId);
  const active = (await activeBookingStats([dep._id])).get(dep.id)?.bookings ?? 0;

  if (active > 0 && body.startDate && body.startDate !== isoFromDate(dep.startDate)) {
    throw new ApiError(409, `This departure has ${active} active booking${active === 1 ? '' : 's'}; its date can’t be changed. Close it and create a new departure instead.`);
  }
  if (active > 0 && body.status === 'cancelled') {
    throw new ApiError(409, `Cancel or move the ${active} active booking${active === 1 ? '' : 's'} first, or set the departure to “closed” to stop new sales.`);
  }

  const set = {};
  const unset = {};
  if (body.startDate) {
    assertFutureDate(body.startDate);
    set.startDate = dateFromIso(body.startDate);
    set.endDate = dateFromIso(addDays(body.startDate, pkg.durationDays - 1));
  }
  if (body.status) set.status = body.status;
  if (body.pricePerPerson === null) unset.pricePerPerson = 1;
  else if (body.pricePerPerson !== undefined) set.pricePerPerson = body.pricePerPerson;

  if (body.capacity !== undefined) {
    const cap = body.capacity;
    const updated = await Departure.findOneAndUpdate(
      { _id: dep._id, $expr: { $gte: [cap, { $subtract: ['$capacity', '$seatsRemaining'] }] } },
      [{ $set: { ...set, seatsRemaining: { $subtract: [cap, { $subtract: ['$capacity', '$seatsRemaining'] }] }, capacity: cap } }, ...(Object.keys(unset).length ? [{ $unset: Object.keys(unset) }] : [])],
      { returnDocument: 'after', updatePipeline: true },
    );
    if (!updated) {
      const fresh = await Departure.findById(dep._id);
      const booked = fresh.capacity - fresh.seatsRemaining;
      throw ApiError.badRequest('Validation failed', [{ field: 'capacity', message: `Capacity can’t be below the ${booked} seats already booked` }]);
    }
    return presentDeparture(updated, await activeBookingStats([updated._id]));
  }

  const updated = await Departure.findByIdAndUpdate(dep._id, { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { returnDocument: 'after', runValidators: true });
  return presentDeparture(updated, await activeBookingStats([updated._id]));
}

/* --------------------------------------------------------------- bookings */

export async function listBookingsAdmin({ q, status, from, to, page, limit }) {
  await expireStaleHolds();
  const filter = {};
  if (status) filter.bookingStatus = status;
  if (from || to) {
    filter.startDate = {};
    if (from) filter.startDate.$gte = dateFromIso(from);
    if (to) filter.startDate.$lte = dateFromIso(to);
  }
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ $or: [{ name: re }, { email: re }] }, '_id').limit(200);
    filter.$or = [{ reference: re }, { packageTitle: re }, { destination: re }, { userId: { $in: users.map((u) => u._id) } }];
  }
  const [total, docs] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email'),
  ]);
  const items = await Promise.all(
    docs.map(async (b) => {
      const customer = b.userId ? { id: String(b.userId._id), name: b.userId.name, email: b.userId.email } : null;
      b.depopulate('userId');
      return { ...(await presentBooking(b)), customer };
    }),
  );
  return { items, ...paginate(total, page, limit) };
}

/**
 * PATCH /admin/bookings/:id/status — allowed transitions:
 *   pending|confirmed → cancelled   (seats released; paid → demo refund)
 *   confirmed → completed           (only once the trip has started)
 */
export async function changeBookingStatus(admin, id, status) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Booking not found');
  if (status === 'cancelled') return cancelBooking(admin, id);

  const booking = await Booking.findById(id);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.bookingStatus !== 'confirmed') {
    throw new ApiError(409, `Only confirmed bookings can be completed (this one is ${booking.bookingStatus})`);
  }
  if (isoFromDate(booking.startDate) > todayIso()) {
    throw new ApiError(409, `This trip starts on ${isoFromDate(booking.startDate)}; it can be marked completed once it has started.`);
  }
  const updated = await Booking.findOneAndUpdate({ _id: booking._id, bookingStatus: 'confirmed' }, { bookingStatus: 'completed' }, { returnDocument: 'after' });
  if (!updated) throw new ApiError(409, 'The booking changed in the meantime; please refresh');
  return updated;
}
