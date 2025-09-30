// src/App.jsx
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext"; // <- corrigido
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";

import HomePage from "./pages/HomePage";
import FilmsPage from "./pages/FilmsPage";
import FilmDetailPage from "./pages/FilmDetailPage";
import ProfilePage from "./pages/ProfilePage";
import EncontrarPage from "./pages/EncontrarPage";
import ApoiePage from "./pages/ApoiePage";
import ModeratorDashboard from "./pages/ModeratorDashboard";
import ApiTestPage from "./pages/ApiTestPage";

// (opcional) Toaster global do shadcn, se existir no seu projeto
// Se não tiver esse arquivo, remova as 2 linhas abaixo.
import { Toaster } from "./components/ui/toaster";

import "./App.css";
import "./index.css";

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RequireModerator({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "moderator") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-dvh bg-white flex flex-col">
          <Navigation />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/films" element={<FilmsPage />} />
              <Route path="/films/:id" element={<FilmDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/encontrar" element={<EncontrarPage />} />
              <Route path="/apoie" element={<ApoiePage />} />
              <Route
                path="/moderator"
                element={
                  <RequireModerator>
                    <ModeratorDashboard />
                  </RequireModerator>
                }
              />
              <Route path="/api-test" element={<ApiTestPage />} />
              {/* 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>

        {/* Toaster global (remova se não existir no projeto) */}
        {typeof Toaster !== "undefined" && <Toaster />}
      </BrowserRouter>
    </AuthProvider>
  );
}
