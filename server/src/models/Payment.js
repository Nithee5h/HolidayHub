import mongoose from 'mongoose';
import { toJSONPlugin } from '../utils/toJSON.js';
import { DEMO_PAYMENT_RESULTS } from './constants.js';

/* Simulated payments only — no card data is ever accepted or stored. */
const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['INR'], default: 'INR' },
    provider: { type: String, enum: ['demo'], default: 'demo' },
    status: { type: String, enum: DEMO_PAYMENT_RESULTS, required: true },
    transactionReference: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// At most one successful demo charge per booking.
paymentSchema.index({ bookingId: 1 }, { unique: true, partialFilterExpression: { status: 'success_demo' } });
paymentSchema.plugin(toJSONPlugin);

export const Payment = mongoose.model('Payment', paymentSchema);
