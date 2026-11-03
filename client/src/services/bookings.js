import { get, patch, post } from './http';

export const quoteBooking = (departureId, travellerCount) => post('/bookings/quote', { departureId, travellerCount });
export const createBooking = (payload) => post('/bookings', payload).then((d) => d.booking);
export const listMyBookings = () => get('/bookings/my').then((d) => d.items);
export const getBooking = (id) => get(`/bookings/${encodeURIComponent(id)}`).then((d) => d.booking);
export const cancelBooking = (id) => patch(`/bookings/${encodeURIComponent(id)}/cancel`).then((d) => d.booking);
/** Simulated payment. `outcome: 'decline'` demonstrates a failed payment. */
export const payDemo = (bookingId, outcome = 'success') => post('/payments/demo', { bookingId, outcome });
