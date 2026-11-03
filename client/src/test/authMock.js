import { vi } from 'vitest';

/*
 * Controllable fake for services/auth used by page/route tests:
 *   vi.mock('../services/auth', () => authMock.module)
 *   authMock.reset({ user })  // null → anonymous
 */
export const authMock = {
  user: null,
  module: {
    fetchCurrentUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
  },
  reset({ user = null } = {}) {
    this.user = user;
    const m = this.module;
    Object.values(m).forEach((fn) => fn.mockReset());
    m.fetchCurrentUser.mockImplementation(async () => authMock.user);
    m.logout.mockImplementation(async () => ({ loggedOut: true }));
  },
};

export const customerUser = { id: 'u1', name: 'Asha Rao', email: 'asha@example.com', phone: '+91 98765 43210', role: 'customer', createdAt: '2026-10-01T10:00:00.000Z' };
export const adminUser = { ...customerUser, id: 'a1', name: 'Hub Admin', email: 'admin@holidayhub.test', role: 'admin' };
