import { ApiError } from './ApiError';

const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

/**
 * fetch wrapper for the HolidayHub API. Unwraps `{ success, data }` and
 * converts error envelopes / network failures into ApiError.
 */
export async function request(path, { method = 'GET', body, query, signal } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : '';
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}${qs}`, {
      method,
      signal,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection and try again.', 0);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.error?.message ?? `Request failed (${response.status})`, response.status, payload?.error?.details);
  }
  return payload.data;
}

export const get = (path, query) => request(path, { query });
export const post = (path, body) => request(path, { method: 'POST', body });
export const patch = (path, body) => request(path, { method: 'PATCH', body });
export const put = (path, body) => request(path, { method: 'PUT', body });
export const del = (path) => request(path, { method: 'DELETE' });
