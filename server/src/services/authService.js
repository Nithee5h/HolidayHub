import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export const SESSION_COOKIE = 'hh_session';
const BCRYPT_ROUNDS = 12;
// Compared against when an email is unknown so login timing doesn't reveal accounts.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', BCRYPT_ROUNDS);

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

export function signSession(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_SECRET, { expiresIn: `${env.SESSION_DAYS}d` });
}

export function verifySession(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

/** Cookie attributes; `clear` omits maxAge so res.clearCookie matches the original. */
export function sessionCookieOptions({ clear = false } = {}) {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.COOKIE_SAMESITE,
    path: '/',
    ...(clear ? {} : { maxAge: env.SESSION_DAYS * 24 * 60 * 60 * 1000 }),
  };
}

/** Create a customer account. Role is never taken from input. */
export async function registerCustomer({ name, email, phone, password }) {
  if (await User.exists({ email })) {
    throw new ApiError(409, 'An account with this email already exists', [{ field: 'email', message: 'This email is already registered' }]);
  }
  const passwordHash = await hashPassword(password);
  return User.create({ name, email, phone, passwordHash, role: 'customer' });
}

/** Verify credentials; same error for unknown email and wrong password. */
export async function authenticate({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, 'Invalid email or password');
  return user;
}
