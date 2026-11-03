import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Departure, Package } from '../src/models/index.js';
import { seedCatalog } from '../src/seed/seedCatalog.js';
import { addDays, todayIso } from '../src/utils/dates.js';

const app = createApp();
const get = (url) => request(app).get(url);
const slugs = (res) => res.body.data.items.map((p) => p.slug);

beforeAll(async () => {
  await seedCatalog({ reset: true });
});

describe('GET /api/health', () => {
  it('reports API and database status', async () => {
    const res = await get('/api/health').expect(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok', db: 'connected' } });
  });
});

describe('GET /api/packages', () => {
  it('lists published packages with pagination metadata, featured first', async () => {
    const res = await get('/api/packages?limit=50').expect(200);
    expect(res.body.data).toMatchObject({ total: 10, page: 1, pages: 1, limit: 50 });
    const featured = res.body.data.items.map((p) => p.featured);
    expect(featured).toEqual([...featured].sort((a, b) => Number(b) - Number(a)));
    expect(res.body.data.items[0]).toHaveProperty('id');
    expect(res.body.data.items[0]).not.toHaveProperty('_id');
  });

  it('paginates safely', async () => {
    const res = await get('/api/packages?limit=4&page=3').expect(200);
    expect(res.body.data).toMatchObject({ total: 10, page: 3, pages: 3 });
    expect(res.body.data.items).toHaveLength(2);
  });

  it('search by "Kerala" returns relevant tours (scenario 2)', async () => {
    expect(slugs(await get('/api/packages?destination=Kerala'))).toEqual(['kerala-backwaters-escape']);
    expect(slugs(await get('/api/packages?destination=INDONESIA'))).toEqual(['bali-island-romance']);
  });

  it('treats regex characters in search literally', async () => {
    const res = await get(`/api/packages?destination=${encodeURIComponent('.*')}`).expect(200);
    expect(res.body.data.total).toBe(0);
  });

  it('combines category, theme, price and duration filters', async () => {
    const res = await get('/api/packages?category=Adventure&theme=mountains&maxPrice=50000&duration=6-');
    expect(slugs(res)).toEqual(['manali-snow-trek']);
    const short = await get('/api/packages?duration=1-3&limit=50');
    short.body.data.items.forEach((p) => expect(p.durationDays).toBeLessThanOrEqual(3));
  });

  it('only lists packages with seats for the requested party', async () => {
    const res = await get('/api/packages?travellers=12&limit=50');
    expect(slugs(res)).not.toContain('maldives-overwater-luxury'); // capacity 8
    expect(slugs(res)).not.toContain('paris-romantic-getaway'); // no upcoming departures
    expect(slugs(res)).toContain('swiss-alps-explorer');
  });

  it('applies the departure date window', async () => {
    const date = addDays(todayIso(), 5); // Kerala: +9 sold out, +23 has 2 seats, +44 outside 30-day window
    expect(slugs(await get(`/api/packages?destination=kerala&date=${date}&travellers=2`))).toEqual(['kerala-backwaters-escape']);
    expect(slugs(await get(`/api/packages?destination=kerala&date=${date}&travellers=3`))).toEqual([]);
  });

  it('sorts by price', async () => {
    const res = await get('/api/packages?sort=price-asc&limit=50');
    const prices = res.body.data.items.map((p) => p.basePrice);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('adds a departure summary that skips sold-out departures', async () => {
    const res = await get('/api/packages?destination=kerala');
    const { departureSummary } = res.body.data.items[0];
    expect(departureSummary.upcomingCount).toBe(4);
    expect(departureSummary.next.seatsRemaining).toBe(2);
    expect(departureSummary.next.startDate).toBe(addDays(todayIso(), 23));
  });

  it('ignores empty params and rejects invalid ones with details', async () => {
    await get('/api/packages?category=&destination=').expect(200);
    const bad = await get('/api/packages?category=Space&limit=500').expect(400);
    expect(bad.body.success).toBe(false);
    expect(bad.body.error.details.map((d) => d.field)).toEqual(expect.arrayContaining(['category', 'limit']));
    await get('/api/packages?minPrice=5000&maxPrice=100').expect(400);
    await get('/api/packages?date=12-12-2026').expect(400);
  });

  it('never exposes draft or archived packages', async () => {
    await Package.create({
      slug: 'secret-draft',
      title: 'Secret Draft',
      destination: 'Kerala',
      country: 'India',
      category: 'Budget',
      durationDays: 2,
      summary: 'Draft',
      description: 'Draft package',
      basePrice: 100,
      status: 'draft',
    });
    expect(slugs(await get('/api/packages?destination=kerala'))).not.toContain('secret-draft');
    await get('/api/packages/secret-draft').expect(404);
  });
});

describe('package detail endpoints', () => {
  it('finds a package by slug or id', async () => {
    const bySlug = await get('/api/packages/bali-island-romance').expect(200);
    expect(bySlug.body.data.title).toBe('Bali Island Romance');
    const byId = await get(`/api/packages/${bySlug.body.data.id}`).expect(200);
    expect(byId.body.data.slug).toBe('bali-island-romance');
    const missing = await get('/api/packages/nope').expect(404);
    expect(missing.body.error.message).toBe('Package not found');
  });

  it('returns upcoming open departures (incl. sold out) as calendar dates', async () => {
    const res = await get('/api/packages/kerala-backwaters-escape/departures').expect(200);
    const list = res.body.data;
    expect(list).toHaveLength(4);
    expect(list[0]).toMatchObject({ seatsRemaining: 0, status: 'open', startDate: addDays(todayIso(), 9) });
    expect(list.map((d) => d.startDate)).toEqual([...list.map((d) => d.startDate)].sort());
    list.forEach((d) => expect(d.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/));

    const swiss = await get('/api/packages/swiss-alps-explorer/departures');
    expect(swiss.body.data.every((d) => d.status === 'open')).toBe(true); // past closed one hidden
    expect((await get('/api/packages/paris-romantic-getaway/departures')).body.data).toEqual([]);
  });

  it('suggests related packages', async () => {
    const res = await get('/api/packages/goa-weekend-beach-break/related').expect(200);
    expect(res.body.data[0].slug).toBe('goa-budget-backpacker'); // same destination ranks first
  });

  it('returns a departure with its package', async () => {
    const dep = await Departure.findOne({ seatsRemaining: 14 });
    const res = await get(`/api/departures/${dep.id}`).expect(200);
    expect(res.body.data.package.slug).toBe('kerala-backwaters-escape');
    expect(res.body.data.departure.id).toBe(dep.id);
    await get('/api/departures/not-an-id').expect(404);
    await get('/api/departures/64b000000000000000000000').expect(404);
  });

  it('aggregates facets for the homepage', async () => {
    const res = await get('/api/packages/facets').expect(200);
    expect(res.body.data.destinations).toContainEqual({ name: 'Goa', count: 2, minPrice: 8999 });
    expect(res.body.data.themes).toContainEqual({ name: 'romantic', count: 3 });
  });

  it('returns JSON 404s for unknown API routes', async () => {
    const res = await get('/api/nowhere').expect(404);
    expect(res.body).toMatchObject({ success: false, error: { message: expect.stringContaining('Route not found') } });
  });
});

describe('seeding and model rules', () => {
  it('seed is repeatable without duplicates', async () => {
    const before = await Departure.countDocuments();
    await seedCatalog();
    await seedCatalog();
    expect(await Package.countDocuments({ status: 'published' })).toBe(10);
    expect(await Departure.countDocuments()).toBe(before);
  });

  it('rejects seatsRemaining above capacity', async () => {
    const pkg = await Package.findOne();
    const start = new Date();
    await expect(Departure.create({ packageId: pkg._id, startDate: start, endDate: start, capacity: 5, seatsRemaining: 6 })).rejects.toThrow(
      /cannot exceed capacity/,
    );
  });
});
