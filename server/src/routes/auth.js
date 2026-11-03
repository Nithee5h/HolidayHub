import { Router } from 'express';
import * as ctrl from '../controllers/authController.js';
import { optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { loginBody, registerBody } from '../validators/auth.js';

/** Factory so each app instance gets its own rate-limit state. */
export default function authRouter() {
  const router = Router();
  // Slow down credential stuffing / bulk sign-ups from one IP.
  const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
  const registerLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

  router.post('/register', registerLimit, validate({ body: registerBody }), ctrl.register);
  router.post('/login', loginLimit, validate({ body: loginBody }), ctrl.login);
  router.post('/logout', ctrl.logout);
  // Session check: 200 { user } or 200 { user: null } — anonymous browsing is not an error.
  router.get('/me', optionalAuth, ctrl.me);
  return router;
}
