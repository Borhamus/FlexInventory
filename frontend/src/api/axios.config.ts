import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL: string = import.meta.env.VITE_API_URL;

// Las fotos de items se sirven como archivo estático (/uploads/...), no
// como respuesta de la API — el backend ya devuelve la ruta completa
// (ej. "/uploads/tenant_borhamus/items/8f3a1c2e.jpg"), esto solo le pega
// el origen (http://localhost:8000) adelante para usarla en un <img src>.
export const urlImagen = (ruta?: string | null): string | undefined =>
  ruta ? `${API_BASE_URL}${ruta}` : undefined;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // necesario para enviar/recibir la cookie httpOnly del refresh token
});

// ─────────────────────────────────────────────────────────────────────────
// El access token vive SOLO en memoria (no en localStorage).
// Un script inyectado por XSS no puede leerlo de un storage persistente,
// y el refresh token está en una cookie httpOnly inaccesible desde JS.
// ─────────────────────────────────────────────────────────────────────────
let accessToken: string | null = null;
let onTokenRefreshed: ((token: string) => void) | null = null;

export const setAuthToken = (token: string | null) => {
  accessToken = token;
};

/** Permite a AuthContext enterarse cuando el interceptor renueva el token. */
export const registerTokenRefreshHandler = (cb: (token: string) => void) => {
  onTokenRefreshed = cb;
};

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// ─────────────────────────────────────────────────────────────────────────
// Auto-refresh: ante un 401, intenta renovar el access token con la cookie
// y reintenta el request original una sola vez. Si el refresh también falla,
// la sesión expiró de verdad → limpiar y volver al login.
// Se comparte una única promesa de refresh para evitar una estampida de
// renovaciones cuando varios requests fallan a la vez.
// ─────────────────────────────────────────────────────────────────────────
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const token = res.data.access_token as string;
        accessToken = token;
        onTokenRefreshed?.(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const AUTH_PATHS = ['/auth/token', '/auth/refresh', '/auth/logout'];

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetriableConfig | undefined;
    const isAuthCall = AUTH_PATHS.some((p) => original?.url?.includes(p));

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        // Refresh falló: la sesión expiró de verdad
        accessToken = null;
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
