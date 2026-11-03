import { User } from '../models/index.js';
import * as admin from '../services/adminService.js';
import { presentBooking } from '../services/bookingService.js';
import { created, ok } from '../utils/respond.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** GET /admin/users — customer accounts with basic, non-sensitive fields only. */
export async function listUsers(req, res) {
  const { q, page, limit } = req.valid.query;
  const filter = { role: 'customer' };
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter, 'name email phone role createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  return ok(res, { items: users.map((u) => u.toJSON()), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
}

export const stats = async (_req, res) => ok(res, await admin.getStats());

export const listPackages = async (req, res) => ok(res, await admin.listPackagesAdmin(req.valid.query));
export const getPackage = async (req, res) => ok(res, { package: (await admin.getPackageAdmin(req.valid.params.id)).toJSON() });
export const createPackage = async (req, res) => created(res, { package: (await admin.createPackage(req.valid.body)).toJSON() });
export const updatePackage = async (req, res) => ok(res, { package: (await admin.updatePackage(req.valid.params.id, req.valid.body)).toJSON() });
export const removePackage = async (req, res) => ok(res, await admin.removePackage(req.valid.params.id));

export const listDepartures = async (req, res) => ok(res, { items: await admin.listDepartures(req.valid.query.packageId) });
export const createDeparture = async (req, res) => created(res, { departure: await admin.createDeparture(req.valid.body) });
export const updateDeparture = async (req, res) => ok(res, { departure: await admin.updateDeparture(req.valid.params.id, req.valid.body) });

export const listBookings = async (req, res) => ok(res, await admin.listBookingsAdmin(req.valid.query));
export async function changeBookingStatus(req, res) {
  const booking = await admin.changeBookingStatus(req.user, req.valid.params.id, req.valid.body.status);
  return ok(res, { booking: await presentBooking(booking, { withPayments: true }) });
}
