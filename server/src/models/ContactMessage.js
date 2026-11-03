import mongoose from 'mongoose';
import { toJSONPlugin } from '../utils/toJSON.js';

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    subject: { type: String, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['new', 'read'], default: 'new' },
  },
  { timestamps: true },
);

contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.plugin(toJSONPlugin);

export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
