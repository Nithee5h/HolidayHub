import { Router } from 'express';
import { createContactMessage } from '../controllers/contactController.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { contactBody } from '../validators/contact.js';

/** Factory so each app instance gets its own rate-limit state. */
export default function contactRouter() {
  const router = Router();
  // 5 messages per IP per 10 minutes keeps the public form from being flooded.
  router.post('/', rateLimit({ windowMs: 10 * 60 * 1000, max: 5 }), validate({ body: contactBody }), createContactMessage);
  return router;
}
