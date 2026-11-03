import { Booking, Departure, Package, Payment } from '../models/index.js';
import { addDays, dateFromIso, todayIso } from '../utils/dates.js';
import { departureSchedule } from './data/departures.js';
import packages from './data/packages.json' with { type: 'json' };

const peakPrice = (base, factor) => Math.round((base * factor) / 100) * 100 - 1;

function buildDepartures(pkg, baseIso) {
  return (departureSchedule[pkg.slug] ?? []).map(([offset, capacity, seatsRemaining, status, factor]) => {
    const start = addDays(baseIso, offset);
    return {
      packageId: pkg._id,
      startDate: dateFromIso(start),
      endDate: dateFromIso(addDays(start, pkg.durationDays - 1)),
      ...(factor ? { pricePerPerson: peakPrice(pkg.basePrice, factor) } : {}),
      capacity,
      seatsRemaining,
      status,
    };
  });
}

/**
 * Seed demo packages + departures.
 * - Default (repeatable): upsert packages by slug; add departures only to
 *   packages that have none, so existing bookings stay consistent.
 * - reset: wipe catalog + booking collections first, then insert fresh data.
 */
export async function seedCatalog({ reset = false, baseIso = todayIso() } = {}) {
  if (reset) {
    await Promise.all([Payment.deleteMany({}), Booking.deleteMany({}), Departure.deleteMany({}), Package.deleteMany({})]);
  }

  let departuresCreated = 0;
  for (const data of packages) {
    const pkg = await Package.findOneAndUpdate({ slug: data.slug }, data, {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
    });
    if ((await Departure.countDocuments({ packageId: pkg._id })) === 0) {
      const rows = buildDepartures(pkg, baseIso);
      if (rows.length) await Departure.insertMany(rows);
      departuresCreated += rows.length;
    }
  }
  return { packages: packages.length, departuresCreated };
}
