// frontend/src/contexts/AuthContext.jsx
import React from "react";
import api, { setAuthToken, clearAuthToken } from "../services/api";

export const AuthContext = React.createContext(null);
export const useAuth = () => React.useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const isAuthenticated = !!user?.id;

  async function login(email, name) {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, name });
      const data = res?.data;

      if (!data?.token || !data?.user?.id) {
        const legacy = await api.post(`/auth/login?email=${encodeURIComponent(email)}`);
        if (!legacy?.data?.id) 
          throw new Error("Resposta de login inválida");
        setUser(legacy.data);
        localStorage.setItem("userId", String(legacy.data.id));
        return legacy.data;
      }

      // Guarda e injeta token
      localStorage.setItem("token", data.token);
      setAuthToken(data.token);

      // (compat) ainda grava userId para telas antigas que esperem isso
      localStorage.setItem("userId", String(data.user.id));

      setUser(data.user);
      return data.user;
    } catch (err) {
      // limpa tudo em caso de erro
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      clearAuthToken();
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    clearAuthToken();
  }

  React.useEffect(() => {
    let mounted = true;

    async function restore() {
      try {
        // 1) Prioriza token JWT novo
        const token = localStorage.getItem("token");
        if (token) {
          setAuthToken(token);
          const r = await api.get("/auth/me"); // Bearer token via interceptor
          if (mounted) {
            setUser(r.data);
            return;
          }
        }

        // 2) Fallback legado: se só existir userId, tenta /auth/me?user_id=
        const userId = localStorage.getItem("userId");
        if (userId) {
          const r = await api.get(`/auth/me?user_id=${encodeURIComponent(userId)}`);
          if (mounted) {
            setUser(r.data);
            return;
          }
        }

        // 3) Sem sessão
        if (mounted) {
          setUser(null);
          clearAuthToken();
        }
      } catch {
        if (mounted) {
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          clearAuthToken();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    restore();
    return () => { mounted = false; };
  }, []);

  // Sincroniza sessão entre abas (token e userId, por compat)
  React.useEffect(() => {
    function onStorage(e) {
      if (e.key === "token" || e.key === "userId") {
        const nextToken = localStorage.getItem("token");
        const nextUserId = localStorage.getItem("userId");

        if (nextToken) {
          setAuthToken(nextToken);
          api.get("/auth/me")
            .then((r) => setUser(r.data))
            .catch(() => {
              localStorage.removeItem("token");
              clearAuthToken();
              setUser(null);
            });
        } else if (nextUserId) {
          api
            .get(`/auth/me?user_id=${encodeURIComponent(nextUserId)}`)
            .then((r) => setUser(r.data))
            .catch(() => {
              localStorage.removeItem("userId");
              setUser(null);
            });
        } else {
          clearAuthToken();
          setUser(null);
        }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
