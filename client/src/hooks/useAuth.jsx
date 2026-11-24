import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasOwner, setHasOwner] = useState(true);
  const [canRegister, setCanRegister] = useState(false);

  const checkStatus = async () => {
    try {
      const statusRes = await api.get('/auth/status');
      setHasOwner(statusRes.hasOwner);
      setCanRegister(statusRes.canRegister);

      if (statusRes.hasOwner) {
        const meRes = await api.get('/auth/me');
        setUser(meRes.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.user);
    return res;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    setUser(res.user);
    setHasOwner(true);
    return res;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const meRes = await api.get('/auth/me');
      setUser(meRes.user);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        hasOwner,
        canRegister,
        login,
        register,
        logout,
        refreshUser,
        checkStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
