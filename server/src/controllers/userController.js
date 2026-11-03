import { ok } from '../utils/respond.js';

/** PATCH /users/me — name and phone only; email is the account identifier and role is never editable here. */
export async function updateMe(req, res) {
  const { name, phone } = req.valid.body;
  if (name !== undefined) req.user.name = name;
  if (phone === null) req.user.set('phone', undefined);
  else if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  return ok(res, { user: req.user.toJSON() });
}
