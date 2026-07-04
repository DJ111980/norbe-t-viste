import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest, isUnauthorizedError } from '../lib/api';
import type { AuthUser } from '../types';
import { AuthContext } from './auth-context';

const TOKEN_STORAGE_KEY = 'norbe.auth.token';

interface LoginResponse {
  token: string;
  tokenType: 'Bearer';
  user: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    const activeToken = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (activeToken) {
      await apiRequest('/auth/logout', { method: 'POST', token: activeToken }).catch(
        () => undefined,
      );
    }

    clearSession();
  }, [clearSession]);

  const login = useCallback(async (usuario: string, contrasena: string) => {
    const session = await apiRequest<LoginResponse, { usuario: string; contrasena: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: { usuario, contrasena },
      },
    );

    localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
    setToken(session.token);
    setUser(session.user);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const session = await apiRequest<MeResponse>('/auth/me', { token });

        if (isMounted) {
          setUser(session.user);
        }
      } catch (error) {
        if (isMounted && isUnauthorizedError(error)) {
          clearSession();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, [clearSession, token]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
    }),
    [isLoading, login, logout, token, user],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
