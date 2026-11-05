import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { api, setSessionExpiredHandler, tokenStore } from './api';

export interface Me {
  id: number;
  name: string;
  username: string | null;
  type: 'STAFF' | 'TECHNICIAN' | 'CUSTOMER' | 'SALES_REP';
  roles: { code: string; nameAr: string }[];
  permissions: string[];
}

interface AuthState {
  user: Me | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<Me>('/auth/me')).data,
    enabled: !!tokenStore.get(),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const clear = useCallback(() => {
    tokenStore.clear();
    qc.clear();
    qc.setQueryData(['me'], null);
  }, [qc]);

  useEffect(() => setSessionExpiredHandler(clear), [clear]);

  const value = useMemo<AuthState>(() => {
    const user = me.data ?? null;
    return {
      user,
      loading: !!tokenStore.get() && me.isLoading,
      async login(username, password) {
        const { data } = await api.post('/auth/login', { username, password });
        tokenStore.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        await qc.fetchQuery({ queryKey: ['me'], queryFn: async () => (await api.get<Me>('/auth/me')).data });
      },
      async logout() {
        const t = tokenStore.get();
        if (t) await api.post('/auth/logout', { refreshToken: t.refreshToken }).catch(() => {});
        clear();
      },
      can: (p) => !!user?.permissions.includes(p),
    };
  }, [me.data, me.isLoading, qc, clear]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
