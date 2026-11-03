import { ApiError } from '../utils/ApiError.js';

/**
 * Minimal fixed-window, in-memory rate limiter keyed by client IP.
 * Suitable for a single-instance demo; use a shared store if scaled out.
 */
export function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.start + windowMs - now) / 1000)));
      return next(new ApiError(429, 'Too many requests. Please try again later.'));
    }
    return next();
  };
}
