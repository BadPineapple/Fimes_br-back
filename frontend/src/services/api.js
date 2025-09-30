// frontend/src/services/api.js
import axios from "axios";

// Detecta ambiente (CRA e Vite)
const CRA_BASE = process.env.REACT_APP_BACKEND_URL;             // CRA
const VITE_BASE = typeof import.meta !== "undefined" && import.meta.env
  ? import.meta.env.VITE_API_BASE_URL                           // Vite
  : undefined;

// Hardcoded TEMPORÁRIO (mantido como fallback)
const HARDCODED_BASE = "http://localhost:8001";

// Prioridade: Vite -> CRA -> hardcoded
const BACKEND_URL = (VITE_BASE || CRA_BASE || HARDCODED_BASE).replace(/\/+$/, "");
export const API_BASE = `${BACKEND_URL}/api`;

// Debug só em dev
if (process.env.NODE_ENV !== "production") {
  console.log("=== API CONFIG DEBUG ===");
  console.log("[CRA] REACT_APP_BACKEND_URL:", CRA_BASE);
  // Vite pode não existir em CRA; proteja o acesso:
  const viteShown = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_API_BASE_URL : undefined;
  console.log("[VITE] VITE_API_BASE_URL:", viteShown);
  console.log("BACKEND_URL (resolved):", BACKEND_URL);
  console.log("API_BASE:", API_BASE);
}

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  // withCredentials: true, // habilite se usar cookies HttpOnly no futuro
});

// ====== Auth helpers (para usar no AuthContext futuramente) ======
let authToken = null;

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function clearAuthToken() {
  authToken = null;
  delete api.defaults.headers.common.Authorization;
}

// ====== Interceptors ======
api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Normaliza erro e evita logar dados sensíveis
    const status = error?.response?.status;
    const url = error?.config?.url;
    if (process.env.NODE_ENV !== "production") {
      console.warn("[API ERROR]", status, url, error?.message);
    }
    // Futuro: se for 401 e você tiver refresh, tente renovar aqui
    return Promise.reject(error);
  }
);

export default api;
