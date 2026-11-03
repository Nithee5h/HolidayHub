import { ApiError } from '../utils/ApiError.js';

/**
 * Validate request parts with zod schemas. Parsed (coerced) values are stored
 * on `req.valid` because Express 5 makes `req.query` read-only.
 */
export const validate = (schemas) => (req, _res, next) => {
  req.valid = {};
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.') || part, message: i.message }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    req.valid[part] = result.data;
  }
  return next();
};
