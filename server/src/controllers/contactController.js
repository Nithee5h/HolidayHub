import { ContactMessage } from '../models/index.js';
import { created } from '../utils/respond.js';

/** Persist a contact message; responds only with what the sender needs. */
export async function createContactMessage(req, res) {
  const message = await ContactMessage.create(req.valid.body);
  return created(res, { id: message.id, receivedAt: message.createdAt });
}
