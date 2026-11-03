import mongoose from 'mongoose';
import { toJSONPlugin } from '../utils/toJSON.js';
import { BOOKING_STATUSES, PAYMENT_STATUSES } from './constants.js';

const travellerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    age: { type: Number, min: 0, max: 120 },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    departureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Departure', required: true },
    // Snapshot of trip labels so history survives later package edits.
    packageTitle: { type: String, required: true },
    packageSlug: { type: String, required: true },
    destination: { type: String, required: true },
    coverImage: { url: String, alt: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    travellers: { type: [travellerSchema], validate: [(v) => v.length > 0, 'At least one traveller is required'] },
    travellerCount: { type: Number, required: true, min: 1 },
    unitPriceSnapshot: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['INR'], default: 'INR' },
    bookingStatus: { type: String, enum: BOOKING_STATUSES, default: 'pending' },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
    idempotencyKey: { type: String, maxlength: 100 },
    // Seats are held for unpaid (pending) bookings until this time.
    holdExpiresAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, enum: ['customer', 'admin', 'hold_expired'] },
  },
  { timestamps: true },
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ bookingStatus: 1, paymentStatus: 1, holdExpiresAt: 1 });
bookingSchema.index({ departureId: 1 });
// A retried "create booking" request with the same key returns the original booking.
bookingSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
bookingSchema.plugin(toJSONPlugin, { dateOnly: ['startDate', 'endDate'] });

export const Booking = mongoose.model('Booking', bookingSchema);
