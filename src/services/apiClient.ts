// services/apiClient.ts
import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { Platform } from 'react-native';
import { parseError }  from '@/utils/errorHandler';
import { toast }       from '@/utils/toast';

export const TokenStorage = {
  async get(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return localStorage.getItem('@mv_token');
      const { default: AS } = await import('@react-native-async-storage/async-storage');
      return AS.getItem('@mv_token');
    } catch { return null; }
  },
  async set(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') { localStorage.setItem('@mv_token', token); return; }
      const { default: AS } = await import('@react-native-async-storage/async-storage');
      await AS.setItem('@mv_token', token);
    } catch {}
  },
  async remove(): Promise<void> {
    try {
      if (Platform.OS === 'web') { localStorage.removeItem('@mv_token'); return; }
      const { default: AS } = await import('@react-native-async-storage/async-storage');
      await AS.removeItem('@mv_token');
    } catch {}
  },
};

const client: AxiosInstance = axios.create({
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor ─────────────────────────────────────────
client.interceptors.request.use(async (config) => {
  const token = await TokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor ────────────────────────────────────────
client.interceptors.response.use(
  // ✅ Success — pass through
  (response) => response,

  // ❌ Error — parse + show toast globally
  async (err: AxiosError) => {
    const parsed = parseError(err);

    // ── 401: clear token ──────────────────────────────────────────
    if (parsed.code === 'UNAUTHORIZED') {
      await TokenStorage.remove();
    }

    // ── EMAIL_NOT_VERIFIED: don't show global toast
    // Let the screen handle it with custom banner UI
    if (parsed.code !== 'EMAIL_NOT_VERIFIED') {
      toast.error(parsed.message);
    }

    // ── Attach parsed error so screens can use it ─────────────────
    // err.parsed is custom — TypeScript needs augmentation below
    (err as any).parsed = parsed;

    return Promise.reject(err);
  }
);

export const api = {
  get:    <T>(url: string, params?: object) =>
    client.get<T>(url, { params }).then((r) => r.data),

  post:   <T>(url: string, data?: object, p0?: { headers: { 'Content-Type': string; }; }) =>
    client.post<T>(url, data).then((r) => r.data),

  put:    <T>(url: string, data?: object) =>
    client.put<T>(url, data).then((r) => r.data),

  patch:  <T>(url: string, data?: object) =>
    client.patch<T>(url, data).then((r) => r.data),

  delete: <T>(url: string, payload: { token?: string; deviceId?: string; }) =>
    client.delete<T>(url).then((r) => r.data),

  postForm: <T>(url: string, formData: FormData) =>
    client.post<T>(url, formData, {
      headers:          { 'Content-Type': 'multipart/form-data' },
      transformRequest: (data) => data,
    }).then((r) => r.data),
};

export default client;

export const get     = api.get;
export const post    = api.post;
export const put     = api.put;
export const patch   = api.patch;
export const del     = api.delete;

// ─── TypeScript augmentation for parsed error ─────────────────────
declare module 'axios' {
  interface AxiosError {
    parsed?: import('@/utils/errorHandler').ParsedError;
  }
}