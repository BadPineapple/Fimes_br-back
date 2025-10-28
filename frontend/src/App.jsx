// frontend/src/App.jsx
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
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

import { Toaster } from "./components/ui/toaster";

import "./App.css";
import "./index.css";

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function RequireModerator({ children }) {
  const { user, loading } = useAuth();

  // evita flicker enquanto restaura sessão
  if (loading) return null;

  if (!user) return <Navigate to="/" replace />;
  const allowed = user.role === "moderator" || user.role === "admin";
  if (!allowed) return <Navigate to="/" replace />;
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

        {/* Toaster global */}
        {typeof Toaster !== "undefined" && <Toaster />}
      </BrowserRouter>
    </AuthProvider>
  );
}
