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
  const [debounced, setDebounced] = React.useState("");
  const [selectedGenre, setSelectedGenre] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(searchTerm.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Se seu back for paginado, pode usar { params: { page: 1, pageSize: 500 } }
        const r = await api.get("/films");
        if (!mounted) return;

        const data = r?.data ?? [];
        const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];

        setFilms(items);

        // Derivar gêneros no cliente a partir de film.genres (array de strings)
        const freq = new Map();
        for (const f of items) {
          const gs = Array.isArray(f?.genres) ? f.genres : [];
          for (const g of gs) {
            const key = String(g || "").trim();
            if (!key) continue;
            freq.set(key, (freq.get(key) || 0) + 1);
          }
        }
        const list = [...freq.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([genre, count]) => ({ genre, count }));
        setGenres(list);
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

  const handleGenre = (g) => {
    setSelectedGenre(g);
    setSearchTerm("");
  };

  // filtro local por texto + gênero
  const filtered = React.useMemo(() => {
    let base = films;

    if (selectedGenre) {
      base = base.filter((f) =>
        Array.isArray(f?.genres) ? f.genres.includes(selectedGenre) : false
      );
    }

    if (!debounced) return base;

    return base.filter((f) => {
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
  }, [films, debounced, selectedGenre]);

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

            {/* Filtro por gênero (derivado no cliente) */}
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
              {debounced
                ? `Nenhum filme encontrado para "${searchTerm.trim()}"`
                : "Nenhum filme encontrado"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
