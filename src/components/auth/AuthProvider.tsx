'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AuthUser = {
  id?: number;
  email?: string;
  role?: string;
  exp?: number;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  ready: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeJwt(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(json);
    return {
      id: data.id,
      email: data.email,
      role: data.role,
      exp: data.exp
    };
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('jelbarber_token');
}

function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (!token) {
    window.localStorage.removeItem('jelbarber_token');
  } else {
    window.localStorage.setItem('jelbarber_token', token);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredToken();
    if (stored) {
      setToken(stored);
      setUser(decodeJwt(stored));
    }
    setReady(true);
  }, []);

  const login = useCallback((nextToken: string) => {
    setStoredToken(nextToken);
    setToken(nextToken);
    setUser(decodeJwt(nextToken));
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
    setReady(true);
  }, []);

  const value = useMemo(
    () => ({ token, user, ready, login, logout }),
    [token, user, ready, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
