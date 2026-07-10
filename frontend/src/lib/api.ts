import axios from "axios";

// Nunca hardcode a URL do backend: vem de variável de ambiente do Vite,
// configurada em frontend/.env (veja .env.example).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  // necessário para o cookie httpOnly de refresh trafegar entre
  // localhost:5173 (frontend) e localhost:8000 (backend).
  withCredentials: true,
});

// Access token só em memória (nunca localStorage) — reduz o risco de
// roubo via XSS. A sessão é restaurada no reload via /auth/refresh,
// que usa o cookie httpOnly.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

type RetryableConfig = Parameters<typeof api.request>[0] & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/signup") ||
      originalRequest?.url?.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = api
          .post("/auth/refresh")
          .then((res) => {
            const token = res.data.access_token as string;
            setAccessToken(token);
            return token;
          })
          .catch(() => {
            setAccessToken(null);
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);
