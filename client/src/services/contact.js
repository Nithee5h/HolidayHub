import { post } from './http';

/** POST /contact — persists a message; resolves to { id, receivedAt }. */
export const sendContactMessage = (message) => post('/contact', message);
