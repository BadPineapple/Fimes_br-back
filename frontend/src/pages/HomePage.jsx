// frontend/src/pages/HomePage.jsx
import React from "react";
import api from "../services/api";
import { Button } from "../components/ui/button";
import { Film } from "lucide-react";
import FilmCard from "../components/FilmCard";
import { Link } from "react-router-dom";
import { useToast } from "../hooks/use-toast";

export default function HomePage() {
  const { toast } = useToast();
  const [featured, setFeatured] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // se o back tiver paginação, pode usar params { page:1, pageSize:12 }
        const r = await api.get("/films");
        if (!mounted) return;

        const data = r?.data ?? [];
        const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
        // escolha 12 “destaques” (aqui: os 12 primeiros)
        setFeatured(items.slice(0, 12));
      } catch (e) {
        console.error(e);
        toast({ title: "Erro ao carregar filmes em destaque.", duration: 3000 });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-2xl text-green-800">Carregando filmes brasileiros...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 to-yellow-50">
      <section className="relative h-96 bg-gradient-to-r from-green-800 via-yellow-600 to-blue-800 text-white">
        <div className="absolute inset-0 bg-black/40" aria-hidden="true"></div>
        <div className="relative max-w-7xl mx-auto px-4 h-full flex items-center">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold">Descubra o Melhor do Cinema Brasileiro</h1>
            <p className="text-xl max-w-2xl">
              De clássicos atemporais às mais recentes produções nacionais.
            </p>
            <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black" asChild>
              <Link to="/films" aria-label="Explorar filmes">
                Explorar Filmes
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-green-800 mb-8">Filmes em Destaque</h2>

          {featured.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {featured.map((f) => <FilmCard key={f.id} film={f} />)}
            </div>
          ) : (
            <div className="text-center py-12">
              <Film size={64} className="mx-auto text-green-600 mb-4" aria-hidden="true" />
              <p className="text-green-700 text-lg">Nenhum filme encontrado.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
