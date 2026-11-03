import { Router } from 'express';
import * as ctrl from '../controllers/bookingController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bookingIdParam, createBookingBody, myBookingsQuery, quoteBody } from '../validators/booking.js';

const router = Router();
router.use(requireAuth);

router.post('/quote', validate({ body: quoteBody }), ctrl.quote);
router.post('/', validate({ body: createBookingBody }), ctrl.create);
router.get('/my', validate({ query: myBookingsQuery }), ctrl.listMine);
router.get('/:id', validate({ params: bookingIdParam }), ctrl.getOne);
router.patch('/:id/cancel', validate({ params: bookingIdParam }), ctrl.cancel);

export default router;
