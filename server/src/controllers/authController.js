import { SESSION_COOKIE, authenticate, registerCustomer, sessionCookieOptions, signSession } from '../services/authService.js';
import { created, ok } from '../utils/respond.js';

const startSession = (res, user) => res.cookie(SESSION_COOKIE, signSession(user), sessionCookieOptions());

export async function register(req, res) {
  const user = await registerCustomer(req.valid.body);
  startSession(res, user);
  return created(res, { user: user.toJSON() });
}

export async function login(req, res) {
  const user = await authenticate(req.valid.body);
  startSession(res, user);
  return ok(res, { user: user.toJSON() });
}

/** Idempotent: clears the cookie whether or not a session existed. */
export function logout(_req, res) {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions({ clear: true }));
  return ok(res, { loggedOut: true });
}

export const me = (req, res) => ok(res, { user: req.user ? req.user.toJSON() : null });
