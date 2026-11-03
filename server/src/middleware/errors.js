import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Central error handler → { success: false, error: { message, details? } }. */
export function errorHandler(err, _req, res, _next) {
  let status = err.status ?? err.statusCode ?? 500;
  let message = err.message;
  let details = err.details;

  if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err?.code === 11000) {
    status = 409;
    message = 'A record with these details already exists';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  }

  if (!(err instanceof ApiError) && status >= 500) {
    if (!env.isTest) console.error(err);
    message = env.isProduction ? 'Something went wrong. Please try again.' : message;
  }

  res.status(status).json({ success: false, error: { message, ...(details ? { details } : {}) } });
}
