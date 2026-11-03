import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie-authenticated requests: state-changing requests that
 * carry an Origin (all modern browsers send one) must come from an allowed
 * client origin. Combined with SameSite cookies and strict CORS.
 * Requests without Origin are non-browser clients, which cannot ride a
 * victim's cookies.
 */
export function originGuard(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin || env.clientOrigins.includes(origin)) return next();
  return next(new ApiError(403, 'Request origin not allowed'));
}
