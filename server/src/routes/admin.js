import { Router } from 'express';
import * as ctrl from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  bookingStatusBody,
  createDepartureBody,
  idParam,
  listBookingsAdminQuery,
  listDeparturesQuery,
  listPackagesAdminQuery,
  listUsersQuery,
  packageBody,
  updateDepartureBody,
} from '../validators/admin.js';

const router = Router();

// Every admin route: authenticated AND role === 'admin', enforced server-side.
router.use(requireAuth, requireRole('admin'));

router.get('/stats', ctrl.stats);
router.get('/users', validate({ query: listUsersQuery }), ctrl.listUsers);

router.get('/packages', validate({ query: listPackagesAdminQuery }), ctrl.listPackages);
router.post('/packages', validate({ body: packageBody }), ctrl.createPackage);
router.get('/packages/:id', validate({ params: idParam }), ctrl.getPackage);
router.put('/packages/:id', validate({ params: idParam, body: packageBody }), ctrl.updatePackage);
router.delete('/packages/:id', validate({ params: idParam }), ctrl.removePackage);

router.get('/departures', validate({ query: listDeparturesQuery }), ctrl.listDepartures);
router.post('/departures', validate({ body: createDepartureBody }), ctrl.createDeparture);
router.put('/departures/:id', validate({ params: idParam, body: updateDepartureBody }), ctrl.updateDeparture);

router.get('/bookings', validate({ query: listBookingsAdminQuery }), ctrl.listBookings);
router.patch('/bookings/:id/status', validate({ params: idParam, body: bookingStatusBody }), ctrl.changeBookingStatus);

export default router;
