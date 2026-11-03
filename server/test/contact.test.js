import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { ContactMessage } from '../src/models/index.js';

const valid = { name: 'Asha', email: 'Asha@Example.com', subject: 'Group trip', message: 'Do you offer group discounts for 10 people?' };

describe('POST /api/contact', () => {
  it('validates and persists a message', async () => {
    const res = await request(createApp()).post('/api/contact').send(valid).expect(201);
    expect(res.body.data).toHaveProperty('id');
    const saved = await ContactMessage.findById(res.body.data.id);
    expect(saved).toMatchObject({ email: 'asha@example.com', status: 'new' });
  });

  it('returns field errors for invalid input', async () => {
    const res = await request(createApp()).post('/api/contact').send({ name: 'A', email: 'nope', message: 'short' }).expect(400);
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['email', 'message', 'name']);
  });

  it('rejects malformed JSON', async () => {
    await request(createApp()).post('/api/contact').set('Content-Type', 'application/json').send('{"name":').expect(400);
  });

  it('rate-limits repeated submissions', async () => {
    const app = createApp();
    for (let i = 0; i < 5; i += 1) await request(app).post('/api/contact').send(valid).expect(201);
    const res = await request(app).post('/api/contact').send(valid).expect(429);
    expect(res.headers['retry-after']).toBeDefined();
  });
});
