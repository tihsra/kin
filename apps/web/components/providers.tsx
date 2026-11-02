'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setCsrf } from '@/lib/api';
import type { User } from '@/lib/types';

const Auth = createContext<{
  user: User | null;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}>({ user: null, loading: true, error: '', reload: async () => {} });
export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      const result = await api<{ user: User | null; csrf: string | null }>('/auth/session');
      setUser(result.user);
      setCsrf(result.csrf);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load your session');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return <Auth.Provider value={{ user, loading, error, reload }}>{children}</Auth.Provider>;
}
export const useAuth = () => useContext(Auth);
