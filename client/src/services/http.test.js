import { afterEach, describe, expect, it, vi } from 'vitest';
import { request } from './http';

const respond = (status, body) => vi.fn().mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) });

afterEach(() => vi.unstubAllGlobals());

describe('http client', () => {
  it('unwraps the success envelope and builds query strings', async () => {
    const fetchMock = respond(200, { success: true, data: { items: [] } });
    vi.stubGlobal('fetch', fetchMock);
    await expect(request('/packages', { query: new URLSearchParams({ destination: 'Goa' }) })).resolves.toEqual({ items: [] });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/packages?destination=Goa');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'include' });
  });

  it('turns error envelopes into ApiError with status and details', async () => {
    vi.stubGlobal('fetch', respond(400, { success: false, error: { message: 'Validation failed', details: [{ field: 'email', message: 'bad' }] } }));
    await expect(request('/contact', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 400, message: 'Validation failed', details: [{ field: 'email', message: 'bad' }] });
  });

  it('reports network failures with status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(request('/packages')).rejects.toMatchObject({ status: 0 });
  });

  it('handles non-JSON error responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: () => Promise.reject(new Error('html')) }));
    await expect(request('/packages')).rejects.toMatchObject({ status: 502, message: 'Request failed (502)' });
  });
});
