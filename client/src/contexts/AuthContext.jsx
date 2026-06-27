import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAccessToken, setOnAuthFailure } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      setAccessToken(null);
      localStorage.removeItem('aura_refresh_token');
      setUser(null);
    }
  }, []);

  // Set auth failure callback
  useEffect(() => {
    setOnAuthFailure(() => {
      setAccessToken(null);
      localStorage.removeItem('aura_refresh_token');
      setUser(null);
    });
  }, []);

  // Attempt to restore session on mount
  useEffect(() => {
    async function restoreSession() {
      const refreshToken = localStorage.getItem('aura_refresh_token');
      if (!refreshToken) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.post('/api/auth/refresh', { refreshToken });
        setAccessToken(data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('aura_refresh_token', data.refreshToken);
        }

        const me = await api.get('/api/auth/me');
        setUser(me.user || me);
      } catch {
        localStorage.removeItem('aura_refresh_token');
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    setAccessToken(data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('aura_refresh_token', data.refreshToken);
    }
    const me = await api.get('/api/auth/me');
    setUser(me.user || me);
    return me;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const data = await api.post('/api/auth/register', { email, password, name });
    setAccessToken(data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('aura_refresh_token', data.refreshToken);
    }
    const me = await api.get('/api/auth/me');
    setUser(me.user || me);
    return me;
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    const data = await api.patch('/api/auth/me', profileData);
    setUser((prev) => ({ ...prev, ...(data.user || data) }));
    return data;
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
