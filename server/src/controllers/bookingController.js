import * as bookings from '../services/bookingService.js';
import { created, ok } from '../utils/respond.js';

export const quote = async (req, res) => ok(res, await bookings.quote(req.valid.body));

export async function create(req, res) {
  const { booking, replayed } = await bookings.createBooking(req.user, req.valid.body);
  const data = { booking: await bookings.presentBooking(booking), replayed };
  return replayed ? ok(res, data) : created(res, data);
}

export const listMine = async (req, res) => ok(res, { items: await bookings.listMyBookings(req.user, req.valid.query) });

export async function getOne(req, res) {
  await bookings.expireStaleHolds();
  const booking = await bookings.getAccessibleBooking(req.user, req.valid.params.id);
  return ok(res, { booking: await bookings.presentBooking(booking, { withPayments: true }) });
}

export async function cancel(req, res) {
  const booking = await bookings.cancelBooking(req.user, req.valid.params.id);
  return ok(res, { booking: await bookings.presentBooking(booking, { withPayments: true }) });
}

export async function payDemo(req, res) {
  const { booking, payment, replayed } = await bookings.payDemo(req.user, req.valid.body);
  return ok(res, { booking: await bookings.presentBooking(booking, { withPayments: true }), payment: payment.toJSON(), replayed });
}
