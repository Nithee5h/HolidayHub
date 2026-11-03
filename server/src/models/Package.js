import mongoose from 'mongoose';
import { toJSONPlugin } from '../utils/toJSON.js';
import { CATEGORIES, PACKAGE_STATUSES } from './constants.js';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const itineraryDaySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    activities: [{ type: String, trim: true, maxlength: 80 }],
  },
  { _id: false },
);

const packageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    destination: { type: String, required: true, trim: true, maxlength: 80 },
    country: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, required: true, enum: CATEGORIES },
    durationDays: { type: Number, required: true, min: 1, max: 60 },
    summary: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    basePrice: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['INR'], default: 'INR' },
    images: [imageSchema],
    itinerary: [itineraryDaySchema],
    inclusions: [{ type: String, trim: true, maxlength: 120 }],
    exclusions: [{ type: String, trim: true, maxlength: 120 }],
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
    featured: { type: Boolean, default: false },
    status: { type: String, enum: PACKAGE_STATUSES, default: 'draft' },
  },
  { timestamps: true },
);

packageSchema.index({ status: 1, destination: 1 });
packageSchema.index({ status: 1, category: 1 });
packageSchema.index({ status: 1, basePrice: 1 });
packageSchema.plugin(toJSONPlugin);

export const Package = mongoose.model('Package', packageSchema);
