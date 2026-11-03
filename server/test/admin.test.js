import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Booking, Departure, Package, User } from '../src/models/index.js';
import { seedCatalog } from '../src/seed/seedCatalog.js';
import { signSession } from '../src/services/authService.js';
import { addDays, dateFromIso, todayIso } from '../src/utils/dates.js';

const ORIGIN = 'http://localhost:5173';
const app = createApp();
let n = 0;

function as(user) {
  const cookie = `hh_session=${signSession(user)}`;
  const req = (method, url) => request(app)[method](url).set('Origin', ORIGIN).set('Cookie', cookie);
  return {
    get: (url) => req('get', url),
    post: (url, body) => req('post', url).send(body),
    put: (url, body) => req('put', url).send(body),
    patch: (url, body) => req('patch', url).send(body),
    del: (url) => req('delete', url),
  };
}
const makeUser = async (role) => {
  n += 1;
  return as(await User.create({ name: `${role} ${n}`, email: `${role}${n}@example.com`, passwordHash: 'x', role }));
};

const newPackage = (over = {}) => ({
  title: 'Kerala Backwaters Escape — 5 Days',
  destination: 'Kerala',
  country: 'India',
  category: 'Family',
  durationDays: 5,
  summary: 'Houseboats, tea hills and spice markets in five relaxed days.',
  description: 'A demo package created from the admin dashboard to show the full workflow end to end.',
  basePrice: 21999,
  images: [{ url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944', alt: 'Kerala houseboat' }],
  itinerary: [
    { day: 1, title: 'Arrive in Kochi', description: 'Check in and explore Fort Kochi.' },
    { day: 2, title: 'Alleppey houseboat', description: 'Overnight cruise on the backwaters.', activities: ['Houseboat'] },
  ],
  inclusions: ['4 nights stay'],
  exclusions: ['Flights'],
  tags: ['tropical'],
  ...over,
});

let adminApi;
let customer;
beforeEach(async () => {
  await Promise.all([seedCatalog({ reset: true }), User.deleteMany({})]);
  adminApi = await makeUser('admin');
  customer = await makeUser('customer');
});

describe('admin access', () => {
  it('customers get 403 on every admin endpoint', async () => {
    const res = await Promise.all([
      customer.get('/api/admin/stats'),
      customer.post('/api/admin/packages', newPackage()),
      customer.put('/api/admin/departures/64b000000000000000000000', { capacity: 5 }),
      customer.get('/api/admin/bookings'),
      customer.patch('/api/admin/bookings/64b000000000000000000000/status', { status: 'cancelled' }),
    ]);
    res.forEach((r) => expect(r.status).toBe(403));
  });
});

describe('package + departure lifecycle (scenario 7, demo script steps 1–2)', () => {
  it('creates a draft, publishes it, adds a departure; customers then see and book it', async () => {
    const created = await adminApi.post('/api/admin/packages', newPackage()).expect(201);
    const pkg = created.body.data.package;
    expect(pkg).toMatchObject({ slug: 'kerala-backwaters-escape-5-days', status: 'draft' });
    await request(app).get(`/api/packages/${pkg.slug}`).expect(404); // drafts are hidden

    await adminApi.put(`/api/admin/packages/${pkg.id}`, newPackage({ status: 'published', slug: 'tampered-slug' })).expect(200);
    const listed = await request(app).get('/api/packages?destination=kerala&limit=50');
    expect(listed.body.data.items.map((p) => p.slug)).toContain('kerala-backwaters-escape-5-days'); // slug unchanged

    const start = addDays(todayIso(), 40);
    const dep = await adminApi.post('/api/admin/departures', { packageId: pkg.id, startDate: start, capacity: 6 }).expect(201);
    expect(dep.body.data.departure).toMatchObject({ startDate: start, endDate: addDays(start, 4), capacity: 6, seatsRemaining: 6, status: 'open' });
    const pub = await request(app).get(`/api/packages/${pkg.slug}/departures`).expect(200);
    expect(pub.body.data).toHaveLength(1);

    await customer.post('/api/bookings', { departureId: dep.body.data.departure.id, travellers: [{ name: 'Guest One' }, { name: 'Guest Two' }] }).expect(201);
    const deps = await adminApi.get(`/api/admin/departures?packageId=${pkg.id}`).expect(200);
    expect(deps.body.data.items[0]).toMatchObject({ bookedSeats: 2, activeBookings: 1, seatsRemaining: 4 });
  });

  it('validates package input and slug uniqueness', async () => {
    const bad = await adminApi
      .post('/api/admin/packages', newPackage({ images: [{ url: 'http://insecure.example/x.jpg', alt: 'x' }], itinerary: [{ day: 2, title: 'Oops', description: 'Wrong day number' }] }))
      .expect(400);
    const fields = bad.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['images.0.url', 'images.0.alt', 'itinerary.0.day']));
    const dup = await adminApi.post('/api/admin/packages', newPackage({ slug: 'kerala-backwaters-escape' })).expect(409);
    expect(dup.body.error.details[0].field).toBe('slug');
  });

  it('archives packages with bookings, deletes those without', async () => {
    const fresh = (await adminApi.post('/api/admin/packages', newPackage()).expect(201)).body.data.package;
    await adminApi.post('/api/admin/departures', { packageId: fresh.id, startDate: addDays(todayIso(), 20), capacity: 4 }).expect(201);
    const del = await adminApi.del(`/api/admin/packages/${fresh.id}`).expect(200);
    expect(del.body.data.deleted).toBe(true);
    expect(await Departure.countDocuments({ packageId: fresh.id })).toBe(0);

    const kerala = await Package.findOne({ slug: 'kerala-backwaters-escape' });
    const dep = await Departure.findOne({ packageId: kerala._id, seatsRemaining: 14 });
    await customer.post('/api/bookings', { departureId: dep.id, travellers: [{ name: 'Guest One' }] }).expect(201);
    const arch = await adminApi.del(`/api/admin/packages/${kerala.id}`).expect(200);
    expect(arch.body.data).toMatchObject({ archived: true, package: { status: 'archived' } });
    await request(app).get('/api/packages/kerala-backwaters-escape').expect(404);
    expect(await Booking.countDocuments({ packageId: kerala._id })).toBe(1); // history preserved
  });
});

describe('safe departure updates', () => {
  async function bookedDeparture() {
    const kerala = await Package.findOne({ slug: 'kerala-backwaters-escape' });
    const dep = await Departure.findOne({ packageId: kerala._id, seatsRemaining: 14 }); // capacity 20, 6 already "sold" in seed
    await customer.post('/api/bookings', { departureId: dep.id, travellers: [{ name: 'Guest One' }, { name: 'Guest Two' }, { name: 'Guest Three' }] }).expect(201);
    return dep; // now 9 booked, 11 remaining
  }

  it('never lets capacity drop below booked seats; recomputes remaining seats', async () => {
    const dep = await bookedDeparture();
    const tooSmall = await adminApi.put(`/api/admin/departures/${dep.id}`, { capacity: 8 }).expect(400);
    expect(tooSmall.body.error.details[0].message).toMatch(/9 seats already booked/);
    const ok = await adminApi.put(`/api/admin/departures/${dep.id}`, { capacity: 12, pricePerPerson: 25999 }).expect(200);
    expect(ok.body.data.departure).toMatchObject({ capacity: 12, seatsRemaining: 3, bookedSeats: 9, pricePerPerson: 25999 });
    const cleared = await adminApi.put(`/api/admin/departures/${dep.id}`, { pricePerPerson: null }).expect(200);
    expect(cleared.body.data.departure.pricePerPerson).toBeUndefined();
  });

  it('blocks date changes and cancellation with active bookings, but allows closing sales', async () => {
    const dep = await bookedDeparture();
    await adminApi.put(`/api/admin/departures/${dep.id}`, { startDate: addDays(todayIso(), 90) }).expect(409);
    await adminApi.put(`/api/admin/departures/${dep.id}`, { status: 'cancelled' }).expect(409);
    const closed = await adminApi.put(`/api/admin/departures/${dep.id}`, { status: 'closed' }).expect(200);
    expect(closed.body.data.departure.status).toBe('closed');
  });

  it('rejects past dates for new departures', async () => {
    const kerala = await Package.findOne({ slug: 'kerala-backwaters-escape' });
    const res = await adminApi.post('/api/admin/departures', { packageId: kerala.id, startDate: todayIso(), capacity: 5 }).expect(400);
    expect(res.body.error.details[0].field).toBe('startDate');
  });
});

describe('bookings management (demo script step 7)', () => {
  async function paidBooking() {
    const kerala = await Package.findOne({ slug: 'kerala-backwaters-escape' });
    const dep = await Departure.findOne({ packageId: kerala._id, seatsRemaining: 14 });
    const b = (await customer.post('/api/bookings', { departureId: dep.id, travellers: [{ name: 'Guest One' }] })).body.data.booking;
    await customer.post('/api/payments/demo', { bookingId: b.id }).expect(200);
    return b;
  }

  it('lists bookings with customer info and filters', async () => {
    const b = await paidBooking();
    const all = await adminApi.get('/api/admin/bookings').expect(200);
    expect(all.body.data.items[0]).toMatchObject({ reference: b.reference, customer: { email: expect.stringMatching(/^customer\d+@example\.com$/) } });
    expect((await adminApi.get(`/api/admin/bookings?q=${b.reference}`)).body.data.total).toBe(1);
    expect((await adminApi.get('/api/admin/bookings?q=customer')).body.data.total).toBe(1);
    expect((await adminApi.get('/api/admin/bookings?status=cancelled')).body.data.total).toBe(0);
    expect((await adminApi.get(`/api/admin/bookings?from=${addDays(todayIso(), 400)}`)).body.data.total).toBe(0);
    await adminApi.get('/api/admin/bookings?from=2027-01-02&to=2027-01-01').expect(400);
  });

  it('applies only valid status transitions', async () => {
    const b = await paidBooking();
    const early = await adminApi.patch(`/api/admin/bookings/${b.id}/status`, { status: 'completed' }).expect(409);
    expect(early.body.error.message).toMatch(/once it has started/);
    await adminApi.patch(`/api/admin/bookings/${b.id}/status`, { status: 'pending' }).expect(400);

    await Booking.updateOne({ _id: b.id }, { startDate: dateFromIso(addDays(todayIso(), -2)) });
    const done = await adminApi.patch(`/api/admin/bookings/${b.id}/status`, { status: 'completed' }).expect(200);
    expect(done.body.data.booking).toMatchObject({ bookingStatus: 'completed', tab: 'completed' });
    await adminApi.patch(`/api/admin/bookings/${b.id}/status`, { status: 'cancelled' }).expect(409);
  });

  it('admin cancellation refunds and releases seats', async () => {
    const b = await paidBooking();
    const res = await adminApi.patch(`/api/admin/bookings/${b.id}/status`, { status: 'cancelled' }).expect(200);
    expect(res.body.data.booking).toMatchObject({ bookingStatus: 'cancelled', paymentStatus: 'refunded_demo', cancellationReason: 'admin' });
  });
});

describe('GET /admin/stats', () => {
  it('reports totals, simulated revenue (paid only), monthly series and top destinations', async () => {
    const kerala = await Package.findOne({ slug: 'kerala-backwaters-escape' });
    const dep = await Departure.findOne({ packageId: kerala._id, seatsRemaining: 14 });
    const paid = (await customer.post('/api/bookings', { departureId: dep.id, travellers: [{ name: 'Guest One' }, { name: 'Guest Two' }] })).body.data.booking;
    await customer.post('/api/payments/demo', { bookingId: paid.id }).expect(200);
    await customer.post('/api/bookings', { departureId: dep.id, travellers: [{ name: 'Guest Three' }] }).expect(201); // unpaid

    const s = (await adminApi.get('/api/admin/stats').expect(200)).body.data;
    expect(s.packages).toMatchObject({ total: 10, published: 10 });
    expect(s.bookings).toMatchObject({ total: 2, confirmed: 1, pending: 1 });
    expect(s.customers).toBe(1);
    expect(s.revenueDemo).toBe(paid.totalAmount);
    expect(s.monthly).toHaveLength(6);
    expect(s.monthly.at(-1)).toMatchObject({ month: todayIso().slice(0, 7), bookings: 1, revenue: paid.totalAmount });
    expect(s.topDestinations[0]).toMatchObject({ destination: 'Kerala', bookings: 2, travellers: 3 });
    expect(s.recentBookings).toHaveLength(2);
  });
});
