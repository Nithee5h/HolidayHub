import { isoFromDate } from './dates.js';

/**
 * Mongoose schema plugin: expose `id` instead of `_id`/`__v`, drop
 * `hidden` paths and serialise `dateOnly` paths as 'YYYY-MM-DD'.
 */
export function toJSONPlugin(schema, { hidden = [], dateOnly = [] } = {}) {
  schema.set('toJSON', {
    virtuals: false,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      hidden.forEach((path) => delete ret[path]);
      dateOnly.forEach((path) => {
        if (ret[path]) ret[path] = isoFromDate(ret[path]);
      });
      return ret;
    },
  });
}
