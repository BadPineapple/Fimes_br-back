// frontend/src/pages/FilmDetailPage.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Film as FilmIcon, Star, MessageSquare } from "lucide-react";
import { useToast } from "../hooks/use-toast";

const s = (v) => String(v);

// flags (funcionalidades ainda sem backend)
const FEATURE_LISTS = false;

export default function FilmDetailPage() {
  const { id } = useParams(); // pode ser id ou slug
  const { user } = useAuth();
  const { toast } = useToast();

  const [film, setFilm] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // estado local só para UI de estrelas
  const [myRating, setMyRating] = React.useState(0);
  const [myComment, setMyComment] = React.useState("");

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const filmRes = await api.get(`/films/${id}`);
      setFilm(filmRes.data);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar filme.", duration: 3000 });
      setFilm(null);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50 flex items-center justify-center">
        <div className="text-2xl text-green-800">Carregando filme...</div>
      </div>
    );
  }

  if (!film) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center p-8">
            <CardContent>
              <FilmIcon size={64} className="mx-auto mb-4 text-green-600" />
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

  // normaliza estruturas vindas do backend
  const genres = Array.isArray(film.genres) ? film.genres.map((g) => g.genre || g).filter(Boolean) : [];
  const tags = Array.isArray(film.tags) ? film.tags.map((t) => t.tag || t).filter(Boolean) : [];
  const chips = [...genres, ...tags];

  const watch = Array.isArray(film.whereToWatch) ? film.whereToWatch : [];
  const platforms = watch.map((w) => ({ ...w, platform: w.platform || {} }));

  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* linha superior com chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {chips.length
            ? chips.map((c) => (
                <Badge key={c.id ?? c.name} variant="secondary" className="rounded-full">
                  {c.name}
                </Badge>
              ))
            : null}
        </div>

        {/* grade principal: pôster à esquerda, conteúdo à direita */}
        <div className="grid grid-cols-1 md:grid-cols-[380px,1fr] gap-8">
          {/* pôster / placeholder */}
          <div className="rounded-xl overflow-hidden">
            {film.coverUrl ? (
              <img
                src={film.coverUrl}
                alt={`Capa de ${film.title}`}
                className="w-full h-[360px] md:h-[420px] object-cover rounded-xl shadow-sm"
              />
            ) : (
              <div className="w-full h-[360px] md:h-[420px] rounded-xl shadow-sm bg-gradient-to-br from-green-100 to-yellow-100 flex items-center justify-center">
                <FilmIcon size={96} className="text-green-500" />
              </div>
            )}
          </div>

          {/* infos à direita */}
          <div>
            <h1 className="text-3xl font-bold text-green-900">
              {film.title} {film.year ? `(${film.year})` : ""}
            </h1>

            {/* sinopse */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-green-900">Sinopse</h2>
              <p className="mt-2 text-green-900/90 leading-relaxed">
                {film.synopsis || "Sem sinopse disponível."}
              </p>
            </div>

            {/* minhas listas (apenas UI, ainda desabilitada) */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-green-900">Minhas Listas</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button variant="outline" disabled={!FEATURE_LISTS}>
                  ❤️ Favoritar
                </Button>
                <Button variant="outline" disabled={!FEATURE_LISTS}>
                  👁️ Marcar como Assistido
                </Button>
                <Button variant="outline" disabled={!FEATURE_LISTS}>
                  ⏰ Quero Assistir
                </Button>
                {!FEATURE_LISTS && <span className="text-xs text-gray-500">Em breve.</span>}
              </div>
            </div>

            {/* onde assistir */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-green-900">Onde Assistir</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                {platforms.length ? (
                  platforms.map((w, i) => (
                    <a
                      key={`${w.platformId}-${w.type}-${i}`}
                      href={w.url || w.platform?.website || "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline" className="rounded-full">
                        {w.platform?.name || "Plataforma"}
                      </Button>
                    </a>
                  ))
                ) : (
                  <>
                    {/* pílulas exemplo para lembrar o layout */}
                    <Button variant="outline" className="rounded-full" disabled>
                      Netflix
                    </Button>
                    <Button variant="outline" className="rounded-full" disabled>
                      Globoplay
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* linha inferior: sua avaliação (esquerda) / avaliações da comunidade (direita) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          {/* sua avaliação — exibida mesmo sem backend (só não persiste) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-800">Sua Avaliação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-green-900/80 mb-2">Nota (1–5 estrelas):</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={24}
                      className={`cursor-pointer ${
                        n <= myRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 hover:text-yellow-300"
                      }`}
                      onClick={() => setMyRating(n)}
                      aria-label={`Definir nota ${n}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-green-900/80 mb-2">Comentário (opcional):</p>
                <Textarea
                  rows={4}
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  placeholder="O que você achou do filme?"
                />
              </div>

              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => toast({ title: "Avaliações em breve.", duration: 2000 })}
              >
                Salvar Avaliação
              </Button>
            </CardContent>
          </Card>

          {/* avaliações da comunidade — estado vazio como na referência */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-800">Avaliações da Comunidade (0)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-10">
                <MessageSquare size={48} className="mx-auto mb-4" />
                <p>Ainda não há avaliações para este filme</p>
                <p className="text-xs mt-1">Seja o primeiro a avaliar!</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
