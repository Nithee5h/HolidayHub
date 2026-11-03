import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Booking, Departure, Package, Payment } from '../models/index.js';
import { CANCELLATION_CUTOFF_DAYS, HOLD_MINUTES } from '../models/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { addDays, isoFromDate, todayIso } from '../utils/dates.js';

/*
 * Booking consistency model (no multi-document transactions):
 *  1. Seats are reserved with ONE atomic conditional update
 *     (`seatsRemaining >= n` → `$inc: -n`), so concurrent requests can never
 *     oversell or drive inventory negative.
 *  2. The booking is created as `pending/unpaid` with a hold expiry. If the
 *     insert fails, the reserved seats are released (compensating update).
 *  3. Unpaid holds expire after HOLD_MINUTES; expiry and cancellation release
 *     seats exactly once because the booking state change is itself atomic.
 *  4. Demo payments are idempotent: a unique index allows at most one
 *     successful payment per booking.
 */

const isDuplicateKey = (err) => err?.code === 11000;
const holdCutoff = () => new Date(Date.now());

function newReference(prefix, bytes = 4) {
  return `${prefix}-${crypto.randomBytes(bytes).toString('hex').toUpperCase()}`;
}

/** Give seats back without ever exceeding capacity. */
async function releaseSeats(departureId, count) {
  await Departure.updateOne(
    { _id: departureId },
    [{ $set: { seatsRemaining: { $min: ['$capacity', { $add: ['$seatsRemaining', count] }] } } }],
    { updatePipeline: true }, // Mongoose 9 requires opting in to pipeline updates
  );
}

/** Load a bookable departure + its published package or throw a helpful error. */
async function loadBookableDeparture(departureId) {
  if (!mongoose.isValidObjectId(departureId)) throw ApiError.notFound('Departure not found');
  const departure = await Departure.findById(departureId);
  const pkg = departure && (await Package.findOne({ _id: departure.packageId, status: 'published' }));
  if (!departure || !pkg) throw ApiError.notFound('Departure not found');
  if (departure.status !== 'open' || isoFromDate(departure.startDate) <= todayIso()) {
    throw new ApiError(409, 'This departure is no longer available for booking');
  }
  return { departure, pkg };
}

const unitPriceOf = (pkg, departure) => departure.pricePerPerson ?? pkg.basePrice;

/** POST /bookings/quote — server-authoritative price; writes nothing. */
export async function quote({ departureId, travellerCount }) {
  const { departure, pkg } = await loadBookableDeparture(departureId);
  const unitPrice = unitPriceOf(pkg, departure);
  return {
    departureId: String(departure._id),
    packageTitle: pkg.title,
    startDate: isoFromDate(departure.startDate),
    endDate: isoFromDate(departure.endDate),
    travellerCount,
    unitPrice,
    totalAmount: unitPrice * travellerCount,
    currency: pkg.currency,
    seatsRemaining: departure.seatsRemaining,
    available: departure.seatsRemaining >= travellerCount,
    holdMinutes: HOLD_MINUTES,
  };
}

/** Cancel expired unpaid holds and release their seats. Safe to call any time. */
export async function expireStaleHolds(now = holdCutoff()) {
  const stale = await Booking.find({ bookingStatus: 'pending', paymentStatus: 'unpaid', holdExpiresAt: { $lte: now } }, '_id');
  let expired = 0;
  for (const { _id } of stale) {
    // Conditional update: only the caller that flips the state releases seats.
    const booking = await Booking.findOneAndUpdate(
      { _id, bookingStatus: 'pending', paymentStatus: 'unpaid', holdExpiresAt: { $lte: now } },
      { bookingStatus: 'cancelled', cancelledAt: now, cancellationReason: 'hold_expired' },
      { returnDocument: 'after' },
    );
    if (booking) {
      await releaseSeats(booking.departureId, booking.travellerCount);
      expired += 1;
    }
  }
  return expired;
}

/** POST /bookings — reserve seats and create a pending booking (idempotent per key). */
export async function createBooking(user, { departureId, travellers, idempotencyKey }) {
  if (idempotencyKey) {
    const existing = await Booking.findOne({ userId: user._id, idempotencyKey });
    if (existing) return { booking: existing, replayed: true };
  }
  await expireStaleHolds();

  const { departure, pkg } = await loadBookableDeparture(departureId);
  const count = travellers.length;

  // Atomic reservation: succeeds only if enough seats remain right now.
  const reserved = await Departure.findOneAndUpdate(
    { _id: departure._id, status: 'open', seatsRemaining: { $gte: count } },
    { $inc: { seatsRemaining: -count } },
    { returnDocument: 'after' },
  );
  if (!reserved) {
    const fresh = await Departure.findById(departure._id, 'seatsRemaining');
    const left = fresh?.seatsRemaining ?? 0;
    throw new ApiError(409, left === 0 ? 'Sorry, this departure just sold out' : `Only ${left} seat${left === 1 ? '' : 's'} left on this departure`, [
      { field: 'travellers', message: `Seats available: ${left}` },
    ]);
  }

  const unitPrice = unitPriceOf(pkg, departure);
  const data = {
    userId: user._id,
    packageId: pkg._id,
    departureId: departure._id,
    packageTitle: pkg.title,
    packageSlug: pkg.slug,
    destination: pkg.destination,
    coverImage: pkg.images?.[0] ? { url: pkg.images[0].url, alt: pkg.images[0].alt } : undefined,
    startDate: departure.startDate,
    endDate: departure.endDate,
    travellers,
    travellerCount: count,
    unitPriceSnapshot: unitPrice,
    totalAmount: unitPrice * count,
    currency: pkg.currency,
    idempotencyKey,
    holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const booking = await Booking.create({ ...data, reference: newReference('HH') });
      return { booking, replayed: false };
    } catch (err) {
      if (isDuplicateKey(err) && err.keyPattern?.reference) continue; // reference collision → retry
      await releaseSeats(departure._id, count); // compensate the reservation
      if (isDuplicateKey(err) && err.keyPattern?.idempotencyKey) {
        // A concurrent identical request won the race; return its booking.
        return { booking: await Booking.findOne({ userId: user._id, idempotencyKey }), replayed: true };
      }
      throw err;
    }
  }
  await releaseSeats(departure._id, count);
  throw new ApiError(500, 'Could not create booking reference. Please try again.');
}

/** Load a booking the user may see (owner or admin). */
export async function getAccessibleBooking(user, id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Booking not found');
  const booking = await Booking.findById(id);
  const allowed = booking && (user.role === 'admin' || String(booking.userId) === String(user._id));
  // 404 rather than 403 so booking ids can't be probed.
  if (!allowed) throw ApiError.notFound('Booking not found');
  return booking;
}

/** Which My Bookings tab a booking belongs to. */
export function bookingTab(booking, today = todayIso()) {
  if (booking.bookingStatus === 'cancelled') return 'cancelled';
  if (booking.bookingStatus === 'completed' || isoFromDate(booking.endDate) < today) return 'completed';
  return 'upcoming';
}

export function cancellationPolicy(booking, today = todayIso()) {
  const deadline = addDays(isoFromDate(booking.startDate), -CANCELLATION_CUTOFF_DAYS);
  const open = ['pending', 'confirmed'].includes(booking.bookingStatus);
  const unpaidHold = booking.bookingStatus === 'pending' && booking.paymentStatus === 'unpaid';
  return {
    cutoffDays: CANCELLATION_CUTOFF_DAYS,
    deadline,
    // Unpaid holds can always be released; paid trips until the deadline.
    canCancel: open && (unpaidHold || today <= deadline) && isoFromDate(booking.startDate) > today,
  };
}

/** Serialise for API responses (adds derived tab, policy and payments). */
export async function presentBooking(booking, { withPayments = false } = {}) {
  const json = booking.toJSON();
  json.tab = bookingTab(booking);
  json.cancellation = cancellationPolicy(booking);
  if (withPayments) {
    json.payments = (await Payment.find({ bookingId: booking._id }).sort({ createdAt: 1 })).map((p) => p.toJSON());
  }
  return json;
}

/** GET /bookings/my — the user's bookings, optionally one tab. */
export async function listMyBookings(user, { tab } = {}) {
  await expireStaleHolds();
  const bookings = await Booking.find({ userId: user._id }).sort({ startDate: 1, createdAt: -1 });
  const items = await Promise.all(bookings.map((b) => presentBooking(b)));
  return tab ? items.filter((b) => b.tab === tab) : items;
}

/** PATCH /bookings/:id/cancel — owner (within policy) or admin. Seats released exactly once. */
export async function cancelBooking(user, id) {
  await expireStaleHolds();
  const booking = await getAccessibleBooking(user, id);
  const isAdmin = user.role === 'admin';
  const policy = cancellationPolicy(booking);

  if (!['pending', 'confirmed'].includes(booking.bookingStatus)) {
    throw new ApiError(409, `This booking is already ${booking.bookingStatus}`);
  }
  if (!isAdmin && !policy.canCancel) {
    throw new ApiError(409, `Online cancellation closes ${CANCELLATION_CUTOFF_DAYS} days before departure (${policy.deadline}).`);
  }

  const wasPaid = booking.paymentStatus === 'paid_demo';
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, bookingStatus: { $in: ['pending', 'confirmed'] } },
    {
      bookingStatus: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: isAdmin && String(booking.userId) !== String(user._id) ? 'admin' : 'customer',
      ...(wasPaid ? { paymentStatus: 'refunded_demo' } : {}),
    },
    { returnDocument: 'after' },
  );
  if (!updated) throw new ApiError(409, 'This booking was already cancelled');

  await releaseSeats(updated.departureId, updated.travellerCount);
  if (wasPaid) {
    await Payment.create({
      bookingId: updated._id,
      amount: updated.totalAmount,
      currency: updated.currency,
      status: 'refunded_demo',
      transactionReference: newReference('DEMO-REFUND', 5),
    });
  }
  return updated;
}

/**
 * POST /payments/demo — simulated payment for the owner's pending booking.
 * `outcome: 'decline'` records a failed demo attempt (booking stays pending).
 * Repeating a successful request returns the original payment (idempotent).
 */
export async function payDemo(user, { bookingId, outcome = 'success' }) {
  const booking = await getAccessibleBooking(user, bookingId);
  if (String(booking.userId) !== String(user._id)) throw ApiError.notFound('Booking not found');

  const existing = await Payment.findOne({ bookingId: booking._id, status: 'success_demo' });
  if (existing) return { booking, payment: existing, replayed: true };

  await expireStaleHolds();
  const current = await Booking.findById(booking._id);
  if (current.paymentStatus === 'paid_demo') {
    // A concurrent request completed the payment first.
    const winner = await Payment.findOne({ bookingId: current._id, status: 'success_demo' });
    if (winner) return { booking: current, payment: winner, replayed: true };
  }
  if (current.bookingStatus === 'cancelled') {
    throw new ApiError(409, current.cancellationReason === 'hold_expired' ? 'Your seat hold expired. Please book again.' : 'This booking was cancelled');
  }
  if (current.bookingStatus !== 'pending' || current.paymentStatus !== 'unpaid') {
    throw new ApiError(409, 'This booking is not awaiting payment');
  }

  if (outcome === 'decline') {
    const failed = await Payment.create({
      bookingId: current._id,
      amount: current.totalAmount,
      currency: current.currency,
      status: 'failed_demo',
      transactionReference: newReference('DEMO', 5),
    });
    throw new ApiError(402, 'Demo payment declined (simulated). No money was taken — you can try again.', [
      { field: 'payment', message: failed.transactionReference },
    ]);
  }

  let payment;
  try {
    payment = await Payment.create({
      bookingId: current._id,
      amount: current.totalAmount,
      currency: current.currency,
      status: 'success_demo',
      transactionReference: newReference('DEMO', 5),
    });
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    // Concurrent duplicate request: return the payment that won.
    const winner = await Payment.findOne({ bookingId: current._id, status: 'success_demo' });
    return { booking: await Booking.findById(current._id), payment: winner, replayed: true };
  }

  const confirmed = await Booking.findOneAndUpdate(
    { _id: current._id, bookingStatus: 'pending', paymentStatus: 'unpaid' },
    { bookingStatus: 'confirmed', paymentStatus: 'paid_demo', $unset: { holdExpiresAt: 1 } },
    { returnDocument: 'after' },
  );
  if (!confirmed) {
    // The hold expired between checks: undo the charge record.
    payment.status = 'refunded_demo';
    await payment.save();
    throw new ApiError(409, 'Your seat hold expired before payment completed. No money was taken.');
  }
  return { booking: confirmed, payment, replayed: false };
}
