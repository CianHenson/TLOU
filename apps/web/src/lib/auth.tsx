import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { api, post, token } from './api';
import type { AuthUser } from './types';

interface AuthValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  /** Re-read the profile after something that changes it (password change clears must_change_pw). */
  refresh: () => Promise<unknown>;
}

const Ctx = createContext<AuthValue>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<AuthUser>('/auth/me'),
    enabled: !!token.get(),
    retry: false,
  });

  const login = async (username: string, password: string) => {
    const res = await post<{ accessToken: string; user: AuthUser }>('/auth/login', { username, password });
    token.set(res.accessToken);
    qc.removeQueries({ predicate: (q) => !['me', 'site', 'form-schema'].includes(String(q.queryKey[0])) });
    qc.setQueryData(['me'], res.user);
    return res.user;
  };
  const logout = () => {
    post('/auth/logout').catch(() => undefined); // audit entry; ignore failures
    token.clear();
    qc.setQueryData(['me'], null);
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'site' && q.queryKey[0] !== 'form-schema' });
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ['me'] });

  return (
    <Ctx.Provider value={{ user: data ?? null, loading: !!token.get() && isLoading, login, logout, refresh }}>{children}</Ctx.Provider>
  );
}
