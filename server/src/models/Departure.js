import mongoose from 'mongoose';
import { toJSONPlugin } from '../utils/toJSON.js';
import { DEPARTURE_STATUSES } from './constants.js';

const departureSchema = new mongoose.Schema(
  {
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // Optional override of the package's basePrice (e.g. peak season).
    pricePerPerson: { type: Number, min: 0 },
    capacity: { type: Number, required: true, min: 1, max: 500 },
    seatsRemaining: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value) {
          return this.capacity === undefined || value <= this.capacity;
        },
        message: 'seatsRemaining cannot exceed capacity',
      },
    },
    status: { type: String, enum: DEPARTURE_STATUSES, default: 'open' },
  },
  { timestamps: true },
);

departureSchema.path('endDate').validate(function endAfterStart(value) {
  return !this.startDate || value >= this.startDate;
}, 'endDate must be on or after startDate');

departureSchema.index({ packageId: 1, startDate: 1 });
departureSchema.index({ status: 1, startDate: 1 });
departureSchema.plugin(toJSONPlugin, { dateOnly: ['startDate', 'endDate'] });

export const Departure = mongoose.model('Departure', departureSchema);
