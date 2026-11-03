import mongoose from 'mongoose';
import { toJSONPlugin } from '../utils/toJSON.js';
import { ROLES } from './constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true, maxlength: 20 },
    role: { type: String, enum: ROLES, default: 'customer' },
  },
  { timestamps: true },
);

userSchema.plugin(toJSONPlugin, { hidden: ['passwordHash'] });

export const User = mongoose.model('User', userSchema);
