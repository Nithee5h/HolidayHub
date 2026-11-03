import { Router } from 'express';
import { payDemo } from '../controllers/bookingController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { demoPaymentBody } from '../validators/booking.js';

const router = Router();

// Simulated payments only — see docs/security.md.
router.post('/demo', requireAuth, validate({ body: demoPaymentBody }), payDemo);

export default router;
