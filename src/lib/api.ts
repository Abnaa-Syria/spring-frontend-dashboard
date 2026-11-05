import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const KEY = 'spring.tokens';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStore = {
  get(): Tokens | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      return null;
    }
  },
  set(t: Tokens) {
    localStorage.setItem(KEY, JSON.stringify(t));
  },
  clear() {
    localStorage.removeItem(KEY);
  },
};

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t.accessToken}`;
  return config;
});

/** Called when the session can't be refreshed (set by AuthProvider). */
let onSessionExpired = () => {};
export const setSessionExpiredHandler = (fn: () => void) => {
  onSessionExpired = fn;
};

// One refresh at a time; concurrent 401s wait for the same promise.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const t = tokenStore.get();
  if (!t) return null;
  try {
    const { data } = await axios.post<Tokens>(`${BASE_URL}/auth/refresh`, { refreshToken: t.refreshToken });
    tokenStore.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  if (error.response?.status !== 401 || !original || original._retried || original.url?.startsWith('/auth/')) {
    throw error;
  }
  original._retried = true;
  refreshing ??= refreshAccessToken().finally(() => {
    refreshing = null;
  });
  const access = await refreshing;
  if (!access) {
    onSessionExpired();
    throw error;
  }
  original.headers.Authorization = `Bearer ${access}`;
  return api(original);
});

/** Extracts a readable message from an API error. */
export function errorMessage(e: unknown): string {
  if (e instanceof AxiosError) {
    const msg = (e.response?.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(msg)) return msg.join('، ');
    if (msg) return msg;
    if (e.response?.status === 403) return 'ليس لديك صلاحية لهذا الإجراء';
    if (e.response?.status === 409) return 'تعارض: القيمة مستخدمة بالفعل أو الحالة لا تسمح';
    if (!e.response) return 'تعذر الاتصال بالخادم';
  }
  return 'حدث خطأ غير متوقع';
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
