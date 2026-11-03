import { useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../services/auth';
import { AuthContext } from './authContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    authApi.fetchCurrentUser().then(
      (u) => {
        if (!active) return;
        setUser(u);
        setStatus(u ? 'authenticated' : 'anonymous');
      },
      // API unreachable: browse anonymously.
      () => active && setStatus('anonymous'),
    );
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback((u) => {
    setUser(u);
    setStatus('authenticated');
    return u;
  }, []);

  const login = useCallback((credentials) => authApi.login(credentials).then(signIn), [signIn]);
  const register = useCallback((details) => authApi.register(details).then(signIn), [signIn]);
  const updateProfile = useCallback(
    (changes) =>
      authApi.updateProfile(changes).then((u) => {
        setUser(u);
        return u;
      }),
    [],
  );
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Even if the request fails, forget the user locally.
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, isAdmin: user?.role === 'admin', login, register, logout, updateProfile }),
    [user, status, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
