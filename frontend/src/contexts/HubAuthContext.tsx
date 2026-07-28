import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  displayName: string;
  isAnonymous: boolean;
  currentStreak: number;
  longestStreak: number;
  lastCheckinDate?: string;
}

interface HubAuthContextType {
  user: AppUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { name: string; email: string; password: string; isAnonymous?: boolean }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<AppUser>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const HubAuthContext = createContext<HubAuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
});

export const HubAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('hub_token'));
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!localStorage.getItem('hub_token')) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/api/app-auth/me');
      setUser(res.data);
    } catch (err) {
      console.warn('Failed to fetch hub user profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/app-auth/login', { email, password });
    localStorage.setItem('hub_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const signup = async (data: { name: string; email: string; password: string; isAnonymous?: boolean }) => {
    const res = await api.post('/api/app-auth/signup', data);
    localStorage.setItem('hub_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const updateProfile = async (data: Partial<AppUser>) => {
    const res = await api.patch('/api/app-auth/me', data);
    setUser(res.data);
  };

  const logout = () => {
    localStorage.removeItem('hub_token');
    setToken(null);
    setUser(null);
  };

  return (
    <HubAuthContext.Provider
      value={{ user, token, loading, login, signup, logout, updateProfile, refreshProfile }}
    >
      {children}
    </HubAuthContext.Provider>
  );
};

export const useHubAuth = () => useContext(HubAuthContext);
