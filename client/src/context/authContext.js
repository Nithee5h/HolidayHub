import { createContext, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router';

export const AuthContext = createContext(null);

/** { user, status: 'loading' | 'authenticated' | 'anonymous', isAdmin, login, register, logout, updateProfile } */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/**
 * Log out and land on the homepage. Navigates first so route guards on the
 * current (possibly protected) page don't bounce to /login?next=… on the way out.
 */
export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return useCallback(async () => {
    navigate('/', { replace: true });
    await logout();
  }, [logout, navigate]);
}
