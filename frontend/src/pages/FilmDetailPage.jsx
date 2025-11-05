// frontend/src/pages/FilmDetailPage.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Film, Star, MessageSquare } from "lucide-react";
import { useToast } from "../hooks/use-toast";

const s = (v) => String(v);

// Flags de recursos ainda não implementados no backend novo
const FEATURE_RATINGS = false; // /films/:id/ratings, /ratings/average
const FEATURE_LISTS = false;   // /users/:id/film-lists/*
const FEATURE_REPORTS = false; // /comments/report

export default function FilmDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [film, setFilm] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // Estados “futuros” (desativados por enquanto)
  const [ratings, setRatings] = React.useState([]);
  const [avg, setAvg] = React.useState({ average: 0, count: 0 });
  const [userRating, setUserRating] = React.useState({ rating: 0, comment: "" });
  const [savingRating, setSavingRating] = React.useState(false);
  const [lists, setLists] = React.useState({ favorites: false, watched: false, to_watch: false });

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // ✅ BACKEND ATUAL: só precisamos disso
      const filmRes = await api.get(`/films/${id}`);
      setFilm(filmRes.data);

      // Os blocos abaixo só rodam quando existir suporte no backend
      if (FEATURE_RATINGS) {
        try {
          const [ratingsRes, avgRes] = await Promise.all([
            api.get(`/films/${id}/ratings`),
            api.get(`/films/${id}/ratings/average`),
          ]);
          const rData = Array.isArray(ratingsRes.data) ? ratingsRes.data : [];
          const aData = avgRes?.data ?? { average: 0, count: 0 };
          setRatings(rData);
          setAvg(aData);

          if (user?.id) {
            const mine = rData.find((x) => x.user_id === user.id);
            if (mine) setUserRating({ rating: mine.rating ?? 0, comment: mine.comment ?? "" });
          } else {
            setUserRating({ rating: 0, comment: "" });
          }
        } catch {
          setRatings([]);
          setAvg({ average: 0, count: 0 });
        }
      }

      if (FEATURE_LISTS && user?.id) {
        try {
          const [fav, wat, tw] = await Promise.all([
            api.get(`/users/${user.id}/film-lists/favorites?viewer_id=${user.id}`),
            api.get(`/users/${user.id}/film-lists/watched?viewer_id=${user.id}`),
            api.get(`/users/${user.id}/film-lists/to_watch?viewer_id=${user.id}`),
          ]);
          setLists({
            favorites: Array.isArray(fav.data) && fav.data.some((f) => s(f.id) === s(id)),
            watched:   Array.isArray(wat.data) && wat.data.some((f) => s(f.id) === s(id)),
            to_watch:  Array.isArray(tw.data) && tw.data.some((f) => s(f.id) === s(id)),
          });
        } catch {
          setLists({ favorites: false, watched: false, to_watch: false });
        }
      }
    } catch (e) {
      console.error("Erro ao carregar filme:", e);
      toast({ title: "Erro ao carregar filme.", duration: 3000 });
      setFilm(null);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, toast]);

  React.useEffect(() => {
    load();
  }, [load]);

  const submitRating = async () => {
    if (!FEATURE_RATINGS) {
      toast({ title: "Avaliações ainda não disponíveis.", duration: 2500 });
      return;
    }
    if (!user) {
      toast({ title: "Faça login para avaliar.", duration: 2500 });
      return;
    }
    const n = Number(userRating.rating);
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      toast({ title: "Selecione uma nota de 1 a 5.", duration: 2500 });
      return;
    }
    setSavingRating(true);
    try {
      await api.post(`/films/${id}/ratings`, { rating: n, comment: userRating.comment?.trim() ?? "" });
      toast({ title: "Avaliação salva!", duration: 2000 });
      await load();
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao enviar avaliação.", duration: 3000 });
    } finally {
      setSavingRating(false);
    }
  };

  const report = async () => {
    if (!FEATURE_REPORTS) {
      toast({ title: "Denúncias ainda não disponíveis.", duration: 2500 });
      return;
    }
  };

  const toggle = async () => {
    if (!FEATURE_LISTS) {
      toast({ title: "Listas pessoais ainda não disponíveis.", duration: 2500 });
      return;
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-2xl text-green-800">Carregando filme...</div>
        </div>
      </div>
    );
  }

  if (!film) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center p-8">
            <CardContent>
              <Film size={64} className="mx-auto mb-4 text-green-600" aria-hidden="true" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">Filme não encontrado</h2>
              <p className="text-green-700 mb-4">O filme não existe ou foi removido.</p>
              <Link to="/films">
                <Button>Voltar aos Filmes</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render principal
  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Cabeçalho simples */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-800">
            {film.title} {film.year ? `(${film.year})` : ""}
          </h1>
          {film.synopsis && <p className="mt-2 text-green-900/80">{film.synopsis}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sua Avaliação — escondida até o backend suportar */}
          {FEATURE_RATINGS && user && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-800">Sua Avaliação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nota (1–5):</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={24}
                        className={`cursor-pointer ${
                          n <= userRating.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 hover:text-yellow-300"
                        }`}
                        onClick={() => setUserRating((prev) => ({ ...prev, rating: n }))}
                        aria-label={`Definir nota ${n}`}
                      />
                    ))}
                  </div>
                </div>
                <Textarea
                  rows={3}
                  value={userRating.comment}
                  onChange={(e) => setUserRating((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="O que você achou?"
                  maxLength={800}
                />
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={userRating.rating === 0 || savingRating}
                  onClick={submitRating}
                >
                  {savingRating ? "Salvando..." : "Salvar Avaliação"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Avaliações da Comunidade — escondido enquanto não houver endpoint */}
          {FEATURE_RATINGS ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-800">
                  Avaliações da Comunidade ({ratings.length}) • média {avg.average?.toFixed?.(1) ?? "0.0"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ratings.length ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {ratings.map((r) => (
                      <div key={r.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={r.user_avatar} alt={r.user_name ?? "Usuário"} />
                              <AvatarFallback>{(r.user_name?.[0] ?? "?").toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{r.user_name ?? "Usuário"}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  className={i < (r.rating ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                                  aria-hidden="true"
                                />
                              ))}
                            </div>
                            {FEATURE_REPORTS && user && user.id !== r.user_id && (
                              <button
                                onClick={() => report(r.id)}
                                className="text-gray-400 hover:text-red-500 text-xs"
                                title="Denunciar comentário"
                                aria-label="Denunciar comentário"
                              >
                                ⚠️
                              </button>
                            )}
                          </div>
                        </div>
                        {r.comment && <p className="text-gray-700 text-sm">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare size={48} className="mx-auto mb-4" aria-hidden="true" />
                    <p>Ainda não há avaliações.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-800">Avaliações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  Esse recurso estará disponível em breve.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
