import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/index.js';
import { hashPassword } from '../src/services/authService.js';

const ORIGIN = 'http://localhost:5173';
const customer = { name: 'Asha Rao', email: 'asha@example.com', password: 'travel2026', phone: '+91 98765 43210' };

/** Agent that keeps cookies and sends an allowed Origin, like the browser app. */
const browser = (app = createApp()) => {
  const agent = request.agent(app);
  return {
    get: (url) => agent.get(url).set('Origin', ORIGIN),
    post: (url, body) => agent.post(url).set('Origin', ORIGIN).send(body),
    patch: (url, body) => agent.patch(url).set('Origin', ORIGIN).send(body),
  };
};

beforeEach(async () => {
  await User.deleteMany({});
});

describe('registration (scenario 4)', () => {
  it('creates a customer, hashes the password and starts a secure session', async () => {
    const b = browser();
    const res = await b.post('/api/auth/register', customer).expect(201);
    expect(res.body.data.user).toMatchObject({ name: 'Asha Rao', email: 'asha@example.com', role: 'customer' });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^hh_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const stored = await User.findOne({ email: 'asha@example.com' }).select('+passwordHash');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(stored.passwordHash).not.toContain('travel2026');

    await b.get('/api/auth/me').expect(200);
  });

  it('rejects invalid email and weak passwords with field errors', async () => {
    const res = await browser().post('/api/auth/register', { ...customer, email: 'nope', password: 'short' }).expect(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password']));
    const noDigit = await browser().post('/api/auth/register', { ...customer, password: 'onlyletters' }).expect(400);
    expect(noDigit.body.error.details[0].message).toMatch(/number/);
  });

  it('rejects duplicate emails (case-insensitive)', async () => {
    await browser().post('/api/auth/register', customer).expect(201);
    const res = await browser().post('/api/auth/register', { ...customer, email: 'ASHA@example.com' }).expect(409);
    expect(res.body.error.details[0].field).toBe('email');
  });

  it('ignores a role smuggled into public registration', async () => {
    const res = await browser().post('/api/auth/register', { ...customer, role: 'admin' }).expect(201);
    expect(res.body.data.user.role).toBe('customer');
  });
});

describe('login / logout / me (scenario 5)', () => {
  beforeEach(async () => {
    await browser().post('/api/auth/register', customer);
  });

  it('gives the same useful-but-not-revealing error for bad email or password', async () => {
    const wrongPw = await browser().post('/api/auth/login', { email: customer.email, password: 'wrong123' }).expect(401);
    const noUser = await browser().post('/api/auth/login', { email: 'ghost@example.com', password: 'wrong123' }).expect(401);
    expect(wrongPw.body.error.message).toBe('Invalid email or password');
    expect(noUser.body.error.message).toBe(wrongPw.body.error.message);
    expect(wrongPw.headers['set-cookie']).toBeUndefined();
  });

  it('logs in, reports the current user and logs out', async () => {
    const b = browser();
    expect((await b.get('/api/auth/me').expect(200)).body.data.user).toBeNull();
    const login = await b.post('/api/auth/login', { email: 'ASHA@EXAMPLE.COM', password: customer.password }).expect(200);
    expect(login.body.data.user.email).toBe(customer.email);
    expect((await b.get('/api/auth/me').expect(200)).body.data.user.name).toBe('Asha Rao');

    const out = await b.post('/api/auth/logout').expect(200);
    expect(out.headers['set-cookie'][0]).toMatch(/hh_session=;.*Expires=Thu, 01 Jan 1970/);
    expect((await b.get('/api/auth/me').expect(200)).body.data.user).toBeNull();
    await b.patch('/api/users/me', { name: 'After Logout' }).expect(401);
  });

  it('treats tampered tokens as logged out and clears them', async () => {
    const res = await request(createApp()).get('/api/auth/me').set('Cookie', 'hh_session=not.a.jwt').expect(200);
    expect(res.body.data.user).toBeNull();
    expect(res.headers['set-cookie'][0]).toMatch(/hh_session=;/);
    await request(createApp()).patch('/api/users/me').set('Cookie', 'hh_session=not.a.jwt').send({ name: 'X Y' }).expect(401);
  });

  it('rate-limits repeated login attempts per IP', async () => {
    const b = browser(createApp());
    for (let i = 0; i < 10; i += 1) await b.post('/api/auth/login', { email: customer.email, password: 'wrong123' }).expect(401);
    await b.post('/api/auth/login', { email: customer.email, password: customer.password }).expect(429);
  });
});

describe('profile updates', () => {
  it('updates name and phone, never email or role', async () => {
    const b = browser();
    await b.post('/api/auth/register', customer);
    const res = await b.patch('/api/users/me', { name: 'Asha R.', phone: '', email: 'evil@example.com', role: 'admin' }).expect(200);
    expect(res.body.data.user).toMatchObject({ name: 'Asha R.', email: customer.email, role: 'customer' });
    expect(res.body.data.user.phone).toBeUndefined();
    await b.patch('/api/users/me', { name: 'A' }).expect(400);
    await b.patch('/api/users/me', {}).expect(400);
  });

  it('requires authentication', async () => {
    await browser().patch('/api/users/me', { name: 'Someone' }).expect(401);
  });
});

describe('admin authorization (scenario 6)', () => {
  beforeEach(async () => {
    await User.create({ name: 'Admin', email: 'admin@holidayhub.test', passwordHash: await hashPassword('adminpass1'), role: 'admin' });
  });

  it('anonymous → 401, customer → 403, admin → 200 with safe fields only', async () => {
    await browser().get('/api/admin/users').expect(401);

    const cust = browser();
    await cust.post('/api/auth/register', customer);
    const forbidden = await cust.get('/api/admin/users').expect(403);
    expect(forbidden.body.error.message).toMatch(/permission/);

    const admin = browser();
    await admin.post('/api/auth/login', { email: 'admin@holidayhub.test', password: 'adminpass1' }).expect(200);
    const res = await admin.get('/api/admin/users?q=asha').expect(200);
    expect(res.body.data.total).toBe(1);
    expect(Object.keys(res.body.data.items[0]).sort()).toEqual(['createdAt', 'email', 'id', 'name', 'phone', 'role']);
  });

  it('a role change takes effect on the next request (no stale token privileges)', async () => {
    const admin = browser();
    await admin.post('/api/auth/login', { email: 'admin@holidayhub.test', password: 'adminpass1' });
    await admin.get('/api/admin/users').expect(200);
    await User.updateOne({ email: 'admin@holidayhub.test' }, { role: 'customer' });
    await admin.get('/api/admin/users').expect(403);
  });
});

describe('CSRF origin guard', () => {
  it('blocks state-changing requests from foreign origins', async () => {
    const res = await request(createApp()).post('/api/auth/login').set('Origin', 'https://evil.example').send(customer).expect(403);
    expect(res.body.error.message).toMatch(/origin/i);
  });

  it('allows safe methods from anywhere and requests without Origin', async () => {
    await request(createApp()).get('/api/health').set('Origin', 'https://evil.example').expect(200);
    await request(createApp()).post('/api/auth/logout').expect(200);
  });
});
