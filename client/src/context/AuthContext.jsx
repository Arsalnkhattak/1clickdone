import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('1click_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem('1click_token');
    return saved && saved !== 'undefined' && saved !== 'null' ? saved : null;
  });
  const [loading, setLoading] = useState(true);

  // On mount: validate existing token
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('1click_token');
      if (!storedToken || storedToken === 'undefined' || storedToken === 'null') {
        localStorage.removeItem('1click_token');
        localStorage.removeItem('1click_user');
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        const userData = response.data?.data?.user || response.data?.user || response.data?.data;
        setUser(userData);
        setToken(storedToken);
        localStorage.setItem('1click_user', JSON.stringify(userData));
      } catch (error) {
        // Token is invalid — clear everything
        localStorage.removeItem('1click_token');
        localStorage.removeItem('1click_user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const payload = response.data?.data || response.data;

    const newToken = payload?.token || response.data?.token;
    const userData = payload?.user || payload;

    if (newToken) {
      localStorage.setItem('1click_token', newToken);
      setToken(newToken);
    }
    if (userData) {
      localStorage.setItem('1click_user', JSON.stringify(userData));
      setUser(userData);
    }

    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      // Fire and forget
      api.post('/auth/logout').catch(() => {});
    } catch {
      // Ignore errors
    }

    localStorage.removeItem('1click_token');
    localStorage.removeItem('1click_user');
    setUser(null);
    setToken(null);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('1click_user', JSON.stringify(userData));
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
