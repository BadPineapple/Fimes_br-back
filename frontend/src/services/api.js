import axios from "axios";

// Apenas Vite (sem CRA no browser)
const VITE = (typeof import.meta !== "undefined" && import.meta.env) || {};

// Prioridade: VITE_API_URL -> VITE_API_BASE_URL (legado) -> fallback 3333
const BASE =
  VITE.VITE_API_URL ||
  VITE.VITE_API_BASE_URL ||
  "http://localhost:3333";

const BACKEND_URL = String(BASE).replace(/\/+$/, "");
export const API_BASE = BACKEND_URL;

if (import.meta.env.DEV) {
  console.log("=== API CONFIG DEBUG ===");
  console.log("VITE_API_URL:", VITE.VITE_API_URL);
  console.log("VITE_API_BASE_URL (legacy):", VITE.VITE_API_BASE_URL);
  console.log("API_BASE:", API_BASE);
}

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// injeta token do localStorage se não tiver sido setado manualmente
api.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (import.meta.env.DEV) {
      const status = error?.response?.status;
      const url = error?.config?.url;
      console.warn("[API ERROR]", status, url, error?.message);
    }
    return Promise.reject(error);
  }
);

let authToken = null;
export function setAuthToken(token) {
  authToken = token;
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}
export function clearAuthToken() {
  authToken = null;
  delete api.defaults.headers.common.Authorization;
}

export default api;
