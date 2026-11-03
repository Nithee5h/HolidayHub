import { del, get, patch, post, put } from './http';

/* Admin endpoints — every call is authorised server-side (admin role only). */
const qs = (params) => new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null));

export const getStats = () => get('/admin/stats');
export const listCustomers = ({ q, page = 1 } = {}) => get('/admin/users', qs({ q, page }));

export const listPackagesAdmin = (params = {}) => get('/admin/packages', qs(params));
export const getPackageAdmin = (id) => get(`/admin/packages/${id}`).then((d) => d.package);
export const createPackage = (body) => post('/admin/packages', body).then((d) => d.package);
export const updatePackage = (id, body) => put(`/admin/packages/${id}`, body).then((d) => d.package);
/** Archives when bookings exist, otherwise deletes: resolves to { archived } or { deleted }. */
export const removePackage = (id) => del(`/admin/packages/${id}`);

export const listDepartures = (packageId) => get('/admin/departures', qs({ packageId })).then((d) => d.items);
export const createDeparture = (body) => post('/admin/departures', body).then((d) => d.departure);
export const updateDeparture = (id, body) => put(`/admin/departures/${id}`, body).then((d) => d.departure);

export const listBookingsAdmin = (params = {}) => get('/admin/bookings', qs(params));
export const changeBookingStatus = (id, status) => patch(`/admin/bookings/${id}/status`, { status }).then((d) => d.booking);
