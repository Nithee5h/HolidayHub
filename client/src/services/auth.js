import { get, patch, post } from './http';

/* Session lives in an HttpOnly cookie set by the API; JS never sees the token. */
export const fetchCurrentUser = () => get('/auth/me').then((d) => d.user);
export const login = (credentials) => post('/auth/login', credentials).then((d) => d.user);
export const register = (details) => post('/auth/register', details).then((d) => d.user);
export const logout = () => post('/auth/logout');
export const updateProfile = (changes) => patch('/users/me', changes).then((d) => d.user);
