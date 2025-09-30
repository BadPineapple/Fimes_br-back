// frontend/src/contexts/AuthContext.jsx
import React from "react";
import api from "../services/api";

export const AuthContext = React.createContext(null);
export const useAuth = () => React.useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const isAuthenticated = !!user?.id;

  const login = async (email) => {
    setLoading(true);
    try {
      // Preferir body JSON (privacidade). Se a API não aceitar, caímos no fallback com querystring.
      let res;
      try {
        res = await api.post("/auth/login", { email });
      } catch (e) {
        // fallback para o comportamento original
        res = await api.post(`/auth/login?email=${encodeURIComponent(email)}`);
      }

      const data = res?.data;
      if (!data?.id) {
        throw new Error("Resposta de login inválida: faltando id");
      }

      setUser(data);
      localStorage.setItem("userId", String(data.id));
      return data;
    } catch (err) {
      // limpa qualquer resquício
      setUser(null);
      localStorage.removeItem("userId");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("userId");
  };

  // Reidratação inicial com guarda de montagem
  React.useEffect(() => {
    let mounted = true;
    const userId = localStorage.getItem("userId");

    if (!userId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const r = await api.get(`/auth/me?user_id=${encodeURIComponent(userId)}`);
        if (mounted) setUser(r.data);
      } catch {
        if (mounted) {
          localStorage.removeItem("userId");
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Sincronização multi-aba (logout/login em outra aba)
  React.useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "userId") {
        const next = e.newValue;
        if (!next) {
          // logout em outra aba
          setUser(null);
        } else {
          // login em outra aba -> reidrata
          api
            .get(`/auth/me?user_id=${encodeURIComponent(next)}`)
            .then((r) => setUser(r.data))
            .catch(() => {
              localStorage.removeItem("userId");
              setUser(null);
            });
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
