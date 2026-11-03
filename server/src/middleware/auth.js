import { User } from '../models/index.js';
import { SESSION_COOKIE, sessionCookieOptions, verifySession } from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Require a valid session cookie. The user is re-loaded from the database on
 * every request so deleted accounts and role changes take effect immediately.
 */
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next(new ApiError(401, 'Please log in to continue'));
  let payload;
  try {
    payload = verifySession(token);
  } catch {
    return next(new ApiError(401, 'Your session has expired. Please log in again.'));
  }
  const user = await User.findById(payload.sub);
  if (!user) return next(new ApiError(401, 'Please log in to continue'));
  req.user = user;
  return next();
}

/**
 * Attach req.user when a valid session exists; otherwise continue anonymously
 * (clearing a stale cookie). Used by the session-check endpoint.
 */
export async function optionalAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();
  try {
    req.user = (await User.findById(verifySession(token).sub)) ?? undefined;
  } catch {
    req.user = undefined;
  }
  if (!req.user) res.clearCookie(SESSION_COOKIE, sessionCookieOptions({ clear: true }));
  return next();
}

/** Must run after requireAuth. Authorization is decided on the server only. */
export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new ApiError(403, 'You do not have permission to do that'));
