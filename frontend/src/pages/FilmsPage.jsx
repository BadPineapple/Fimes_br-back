// frontend/src/pages/FilmsPage.jsx
import React from "react";
import api from "../services/api";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Film, Search } from "lucide-react";
import FilmCard from "../components/FilmCard";
import { useToast } from "../hooks/use-toast";

export default function FilmsPage() {
  const { toast } = useToast();
  const [films, setFilms] = React.useState([]);
  const [genres, setGenres] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debounced, setDebounced] = React.useState(""); // debounce da busca
  const [selectedGenre, setSelectedGenre] = React.useState("");

  // Debounce da busca (300ms)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(searchTerm.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Carregamento inicial (lista + gêneros)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [f, g] = await Promise.all([api.get("/films"), api.get("/films/genres")]);
        if (!mounted) return;
        setFilms(Array.isArray(f.data) ? f.data : []);
        setGenres(Array.isArray(g.data) ? g.data : []);
      } catch (e) {
        console.error(e);
        toast({ title: "Erro ao carregar filmografia.", duration: 3000 });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const fetchByGenre = async (genre) => {
    try {
      const r = genre
        ? await api.get(`/films/by-genre/${encodeURIComponent(genre)}`)
        : await api.get("/films");
      setFilms(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao filtrar por gênero.", duration: 3000 });
    }
  };

  const handleGenre = (g) => {
    setSelectedGenre(g);
    setSearchTerm(""); // limpa busca ao trocar de gênero (sua lógica original)
    fetchByGenre(g);
  };

  // Filtro por busca: título OU tags/genres
  const filtered = React.useMemo(() => {
    if (!debounced) return films;
    return films.filter((f) => {
      const title = (f?.title || "").toLowerCase();
      const tags = Array.isArray(f?.tags) ? f.tags : [];
      const genresArr = Array.isArray(f?.genres) ? f.genres : [];
      const haystack = [
        title,
        ...tags.map((t) => (t || "").toLowerCase()),
        ...genresArr.map((g) => (g || "").toLowerCase()),
      ];
      return haystack.some((s) => s.includes(debounced));
    });
  }, [films, debounced]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-2xl text-green-800">Carregando filmografia...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-6">Filmografia Brasileira</h1>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
              <Input
                placeholder="Buscar filmes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                maxLength={120}
                aria-label="Buscar filmes"
              />
            </div>

            {/* Filtro por gênero */}
            <div className="flex items-center gap-4">
              <label htmlFor="genre-select" className="text-sm font-medium text-green-800">
                Filtrar por gênero:
              </label>
              <select
                id="genre-select"
                value={selectedGenre}
                onChange={(e) => handleGenre(e.target.value)}
                className="px-4 py-2 border border-green-300 rounded-md bg-white text-green-800"
              >
                <option value="">Todos</option>
                {genres.map((g) => (
                  <option key={g.genre} value={g.genre}>
                    {g.genre} ({g.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedGenre && (
            <div className="mb-4">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Filtrando por: {selectedGenre}
                <button
                  onClick={() => handleGenre("")}
                  className="ml-2 text-green-600 hover:text-green-800"
                  aria-label="Limpar filtro de gênero"
                  title="Limpar filtro"
                >
                  ✕
                </button>
              </Badge>
            </div>
          )}
        </div>

        {filtered.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {filtered.map((f) => (
              <FilmCard key={f.id} film={f} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Film size={64} className="mx-auto text-green-600 mb-4" aria-hidden="true" />
            <p className="text-green-700 text-lg">
              {debounced ? `Nenhum filme encontrado para "${searchTerm.trim()}"` : "Nenhum filme encontrado"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
