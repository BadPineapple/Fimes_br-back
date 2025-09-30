// frontend/src/components/Navigation.jsx
import React from "react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import LoginDialog from "./LoginDialog";
import { Home, Film, Search, Star, MessageSquare, Menu, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext"; // <- corrigido

export default function Navigation() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const items = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/films", icon: Film, label: "Filmes" },
    { to: "/encontrar", icon: Search, label: "Encontrar" },
    { to: "/apoie", icon: Star, label: "Apoie" },
    ...(user?.role === "moderator"
      ? [{ to: "/moderator", icon: MessageSquare, label: "Dashboard", special: true }]
      : []),
  ];

  // Bloqueia scroll do body quando a sidebar está aberta (mobile)
  React.useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [sidebarOpen]);

  // Fecha com Esc
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    if (sidebarOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const initial =
    (user?.name?.trim?.()[0] ?? user?.email?.trim?.()[0] ?? "?").toUpperCase();

  return (
    <>
      <nav
        className="bg-gradient-to-r from-yellow-600 via-green-700 to-blue-800 shadow-lg"
        aria-label="Navegação principal"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-2xl font-bold text-white" aria-label="Ir para a página inicial">
                Filmes.br
              </Link>

              <div className="hidden md:flex space-x-6">
                {items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      className={({ isActive }) =>
                        [
                          "text-white flex items-center gap-2 transition",
                          isActive ? "underline underline-offset-4" : "hover:text-yellow-200",
                          it.special ? "bg-blue-600 px-3 py-1 rounded" : "",
                        ].join(" ")
                      }
                      aria-current={({ isActive }) => (isActive ? "page" : undefined)}
                    >
                      <Icon size={18} />
                      {it.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-white hover:text-yellow-200"
                aria-label="Abrir menu"
              >
                <Menu size={24} />
              </button>

              <div className="hidden md:flex items-center gap-4">
                {user ? (
                  <>
                    <Link to="/profile" className="text-white hover:text-yellow-200 flex items-center gap-2">
                      <span>Olá, {user.name ?? "Usuário"}</span>
                      <Avatar>
                        <AvatarImage src={user.avatar_url} alt={user.name ?? "Usuário"} />
                        <AvatarFallback>{initial}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <Button variant="outline" onClick={logout} aria-label="Sair da conta">
                      Sair
                    </Button>
                  </>
                ) : (
                  <LoginDialog />
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu lateral">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-yellow-600 via-green-700 to-blue-800 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <h2 className="text-xl font-bold text-white">Filmes.br</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-white hover:text-yellow-200"
                aria-label="Fechar menu"
              >
                <X size={24} />
              </button>
            </div>

            <div className="py-4">
              <div className="px-4 pb-4 border-b border-white/20">
                {user ? (
                  <div className="flex items-center gap-3">
                    <Link
                      to="/profile"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 hover:opacity-80"
                    >
                      <Avatar>
                        <AvatarImage src={user.avatar_url} alt={user.name ?? "Usuário"} />
                        <AvatarFallback className="bg-white text-green-800">{initial}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">{user.name ?? "Usuário"}</p>
                        <p className="text-yellow-200 text-xs">Ver perfil</p>
                      </div>
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setSidebarOpen(false);
                      }}
                      className="text-yellow-200 text-sm ml-auto"
                    >
                      Sair
                    </button>
                  </div>
                ) : (
                  <div className="px-4">
                    <LoginDialog />
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-3 px-4 py-3 text-white transition",
                          isActive ? "bg-white/20" : "hover:bg-white/10",
                          it.special ? "bg-blue-600/30" : "",
                        ].join(" ")
                      }
                      aria-current={({ isActive }) => (isActive ? "page" : undefined)}
                    >
                      <Icon size={20} />
                      <span>{it.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
