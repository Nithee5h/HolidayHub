import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Booking, Departure, Package, Payment, User } from '../src/models/index.js';
import { seedCatalog } from '../src/seed/seedCatalog.js';
import { expireStaleHolds } from '../src/services/bookingService.js';
import { signSession } from '../src/services/authService.js';
import { addDays, dateFromIso, todayIso } from '../src/utils/dates.js';

const ORIGIN = 'http://localhost:5173';
const app = createApp();
let n = 0;

/** HTTP client acting as `user` via a signed session cookie (bypasses auth rate limits). */
function as(user) {
  const cookie = `hh_session=${signSession(user)}`;
  const withAuth = (req) => req.set('Origin', ORIGIN).set('Cookie', cookie);
  return {
    get: (url) => withAuth(request(app).get(url)),
    post: (url, body) => withAuth(request(app).post(url)).send(body),
    patch: (url, body) => withAuth(request(app).patch(url)).send(body),
  };
}

async function customer(name = 'Traveller') {
  n += 1;
  return as(await User.create({ name, email: `t${n}@example.com`, passwordHash: 'x', role: 'customer' }));
}

async function admin() {
  n += 1;
  return as(await User.create({ name: 'Boss', email: `boss${n}@example.com`, passwordHash: 'x', role: 'admin' }));
}

const people = (count) => Array.from({ length: count }, (_, i) => ({ name: `Guest Number ${i + 1}`, age: 30 }));

async function departureFor(slug, predicate = () => true) {
  const pkg = await Package.findOne({ slug });
  const list = await Departure.find({ packageId: pkg._id, status: 'open', startDate: { $gt: dateFromIso(todayIso()) } }).sort({ startDate: 1 });
  return { pkg, dep: list.find(predicate) };
}

beforeAll(async () => {
  await User.deleteMany({});
});

beforeEach(async () => {
  await seedCatalog({ reset: true });
});

describe('quotes and creating bookings', () => {
  it('requires a logged-in user', async () => {
    await request(app).post('/api/bookings').set('Origin', ORIGIN).send({}).expect(401);
  });

  it('quotes server-authoritative prices, including departure-specific (peak) prices', async () => {
    const c = await customer();
    const { pkg, dep } = await departureFor('kerala-backwaters-escape', (d) => d.seatsRemaining >= 2 && !d.pricePerPerson);
    const q = await c.post('/api/bookings/quote', { departureId: dep.id, travellerCount: 2 }).expect(200);
    expect(q.body.data).toMatchObject({ unitPrice: pkg.basePrice, totalAmount: 2 * pkg.basePrice, available: true, holdMinutes: 15 });

    const { dep: peak } = await departureFor('kerala-backwaters-escape', (d) => d.pricePerPerson);
    const pq = await c.post('/api/bookings/quote', { departureId: peak.id, travellerCount: 1 }).expect(200);
    expect(pq.body.data.unitPrice).toBe(peak.pricePerPerson);
  });

  it('books 2 travellers at 2 × server price, ignoring client totals, and reserves seats (scenario 8)', async () => {
    const c = await customer();
    const { pkg, dep } = await departureFor('kerala-backwaters-escape', (d) => d.seatsRemaining >= 10);
    const res = await c.post('/api/bookings', { departureId: dep.id, travellers: people(2), totalAmount: 1, unitPriceSnapshot: 1 }).expect(201);
    const b = res.body.data.booking;
    expect(b).toMatchObject({ travellerCount: 2, unitPriceSnapshot: pkg.basePrice, totalAmount: 2 * pkg.basePrice, bookingStatus: 'pending', paymentStatus: 'unpaid', tab: 'upcoming' });
    expect(b.reference).toMatch(/^HH-[0-9A-F]{8}$/);
    expect(new Date(b.holdExpiresAt).getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);
    expect((await Departure.findById(dep.id)).seatsRemaining).toBe(dep.seatsRemaining - 2);
  });

  it('fails without negative inventory when asking for more seats than remain (scenario 9)', async () => {
    const c = await customer();
    const { dep } = await departureFor('kerala-backwaters-escape', (d) => d.seatsRemaining === 2);
    const res = await c.post('/api/bookings', { departureId: dep.id, travellers: people(3) }).expect(409);
    expect(res.body.error.message).toBe('Only 2 seats left on this departure');
    expect((await Departure.findById(dep.id)).seatsRemaining).toBe(2);
  });

  it('never oversells the last seat under concurrent requests (scenario 10)', async () => {
    const { dep } = await departureFor('dubai-city-lights');
    await Departure.updateOne({ _id: dep._id }, { seatsRemaining: 1 });
    const buyers = await Promise.all(Array.from({ length: 8 }, (_, i) => customer(`Buyer ${i}`)));
    const results = await Promise.all(buyers.map((b) => b.post('/api/bookings', { departureId: dep.id, travellers: people(1) })));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(7);
    expect((await Departure.findById(dep.id)).seatsRemaining).toBe(0);
    expect(await Booking.countDocuments({ departureId: dep._id })).toBe(1);
  });

  it('is idempotent per key: retries return the same booking and reserve seats once', async () => {
    const c = await customer();
    const { dep } = await departureFor('bali-island-romance', (d) => d.seatsRemaining >= 5);
    const body = { departureId: dep.id, travellers: people(2), idempotencyKey: 'checkout-abc-123' };
    const [a, b] = await Promise.all([c.post('/api/bookings', body), c.post('/api/bookings', body)]);
    const third = await c.post('/api/bookings', body).expect(200);
    expect(new Set([a.body.data.booking.id, b.body.data.booking.id, third.body.data.booking.id]).size).toBe(1);
    expect(third.body.data.replayed).toBe(true);
    expect((await Departure.findById(dep.id)).seatsRemaining).toBe(dep.seatsRemaining - 2);
  });

  it('rejects closed departures, bad ids and invalid travellers', async () => {
    const c = await customer();
    const pkg = await Package.findOne({ slug: 'swiss-alps-explorer' });
    const closed = await Departure.findOne({ packageId: pkg._id, status: 'closed' });
    await c.post('/api/bookings', { departureId: closed.id, travellers: people(1) }).expect(409);
    await c.post('/api/bookings', { departureId: '64b000000000000000000000', travellers: people(1) }).expect(404);
    const bad = await c.post('/api/bookings', { departureId: closed.id, travellers: [{ name: 'A' }] }).expect(400);
    expect(bad.body.error.details[0].field).toBe('travellers.0.name');
    await c.post('/api/bookings', { departureId: closed.id, travellers: people(13) }).expect(400);
  });
});

describe('demo payments', () => {
  async function pendingBooking(c, travellers = 2) {
    const { dep } = await departureFor('kerala-backwaters-escape', (d) => d.seatsRemaining >= 10);
    return (await c.post('/api/bookings', { departureId: dep.id, travellers: people(travellers) }).expect(201)).body.data.booking;
  }

  it('marks the booking demo-paid, not real-paid (scenario 11)', async () => {
    const c = await customer();
    const b = await pendingBooking(c);
    const res = await c.post('/api/payments/demo', { bookingId: b.id }).expect(200);
    expect(res.body.data.booking).toMatchObject({ bookingStatus: 'confirmed', paymentStatus: 'paid_demo' });
    expect(res.body.data.booking.holdExpiresAt).toBeUndefined();
    expect(res.body.data.payment).toMatchObject({ provider: 'demo', status: 'success_demo', amount: b.totalAmount });
    expect(res.body.data.payment.transactionReference).toMatch(/^DEMO-/);
  });

  it('repeating the payment does not duplicate the charge record (scenario 12)', async () => {
    const c = await customer();
    const b = await pendingBooking(c);
    const results = await Promise.all([1, 2, 3].map(() => c.post('/api/payments/demo', { bookingId: b.id })));
    results.forEach((r) => expect(r.status).toBe(200));
    expect(new Set(results.map((r) => r.body.data.payment.id)).size).toBe(1);
    expect(await Payment.countDocuments({ bookingId: b.id, status: 'success_demo' })).toBe(1);
  });

  it('a simulated decline records a failed attempt and allows retrying', async () => {
    const c = await customer();
    const b = await pendingBooking(c);
    const declined = await c.post('/api/payments/demo', { bookingId: b.id, outcome: 'decline' }).expect(402);
    expect(declined.body.error.message).toMatch(/declined \(simulated\)/);
    expect((await Booking.findById(b.id)).bookingStatus).toBe('pending');
    await c.post('/api/payments/demo', { bookingId: b.id }).expect(200);
    expect(await Payment.countDocuments({ bookingId: b.id })).toBe(2);
  });

  it('other users can neither view nor pay someone else’s booking (scenario 6)', async () => {
    const owner = await customer('Owner');
    const intruder = await customer('Intruder');
    const b = await pendingBooking(owner);
    await intruder.get(`/api/bookings/${b.id}`).expect(404);
    await intruder.post('/api/payments/demo', { bookingId: b.id }).expect(404);
    await intruder.patch(`/api/bookings/${b.id}/cancel`).expect(404);
    await owner.get(`/api/bookings/${b.id}`).expect(200);
  });

  it('expired holds release seats and can no longer be paid', async () => {
    const c = await customer();
    const b = await pendingBooking(c, 3);
    const before = (await Departure.findById(b.departureId)).seatsRemaining;
    await Booking.updateOne({ _id: b.id }, { holdExpiresAt: new Date(Date.now() - 1000) });

    expect(await expireStaleHolds()).toBe(1);
    expect(await expireStaleHolds()).toBe(0); // released once only
    expect((await Departure.findById(b.departureId)).seatsRemaining).toBe(before + 3);
    const res = await c.post('/api/payments/demo', { bookingId: b.id }).expect(409);
    expect(res.body.error.message).toMatch(/hold expired/);
    expect((await Booking.findById(b.id)).cancellationReason).toBe('hold_expired');
  });
});

describe('My Bookings and cancellation (scenario 13)', () => {
  it('lists only the user’s bookings, grouped by tab', async () => {
    const c = await customer();
    const other = await customer();
    const { dep } = await departureFor('bali-island-romance', (d) => d.seatsRemaining >= 5);
    await c.post('/api/bookings', { departureId: dep.id, travellers: people(1) }).expect(201);
    await other.post('/api/bookings', { departureId: dep.id, travellers: people(1) }).expect(201);
    const mine = await c.get('/api/bookings/my').expect(200);
    expect(mine.body.data.items).toHaveLength(1);
    expect((await c.get('/api/bookings/my?tab=cancelled').expect(200)).body.data.items).toHaveLength(0);
    await c.get('/api/bookings/my?tab=nope').expect(400);
  });

  it('cancels a paid booking: history updated, demo refund recorded, seats released once', async () => {
    const c = await customer();
    const { dep } = await departureFor('kerala-backwaters-escape', (d) => d.seatsRemaining >= 10);
    const b = (await c.post('/api/bookings', { departureId: dep.id, travellers: people(2) })).body.data.booking;
    await c.post('/api/payments/demo', { bookingId: b.id }).expect(200);

    const res = await c.patch(`/api/bookings/${b.id}/cancel`).expect(200);
    expect(res.body.data.booking).toMatchObject({ bookingStatus: 'cancelled', paymentStatus: 'refunded_demo', cancellationReason: 'customer', tab: 'cancelled' });
    expect(res.body.data.booking.payments.map((p) => p.status)).toEqual(['success_demo', 'refunded_demo']);
    expect((await Departure.findById(dep.id)).seatsRemaining).toBe(dep.seatsRemaining);

    await c.patch(`/api/bookings/${b.id}/cancel`).expect(409);
    expect((await Departure.findById(dep.id)).seatsRemaining).toBe(dep.seatsRemaining);
    const tabs = await c.get('/api/bookings/my?tab=cancelled');
    expect(tabs.body.data.items).toHaveLength(1);
  });

  it('enforces the 7-day cutoff for customers but lets admins cancel', async () => {
    const c = await customer();
    const { dep } = await departureFor('goa-weekend-beach-break', (d) => d.startDate <= dateFromIso(addDays(todayIso(), 6)));
    const b = (await c.post('/api/bookings', { departureId: dep.id, travellers: people(1) })).body.data.booking;
    await c.post('/api/payments/demo', { bookingId: b.id }).expect(200);
    expect((await c.get(`/api/bookings/${b.id}`)).body.data.booking.cancellation.canCancel).toBe(false);

    const blocked = await c.patch(`/api/bookings/${b.id}/cancel`).expect(409);
    expect(blocked.body.error.message).toMatch(/closes 7 days before departure/);

    const a = await admin();
    const res = await a.patch(`/api/bookings/${b.id}/cancel`).expect(200);
    expect(res.body.data.booking.cancellationReason).toBe('admin');
  });

  it('unpaid holds can always be released by the owner', async () => {
    const c = await customer();
    const { dep } = await departureFor('manali-weekend-escape', (d) => d.startDate <= dateFromIso(addDays(todayIso(), 6)));
    const b = (await c.post('/api/bookings', { departureId: dep.id, travellers: people(2) })).body.data.booking;
    const res = await c.patch(`/api/bookings/${b.id}/cancel`).expect(200);
    expect(res.body.data.booking.paymentStatus).toBe('unpaid');
    expect((await Departure.findById(dep.id)).seatsRemaining).toBe(dep.seatsRemaining);
  });
});
