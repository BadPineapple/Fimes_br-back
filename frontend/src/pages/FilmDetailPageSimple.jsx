// frontend/src/pages/FilmDetailPageSimple.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import { Button } from "../components/ui/button";

export default function FilmDetailPageSimple() {
  const { id } = useParams();
  const [film, setFilm] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let alive = true;

    async function loadFilm() {
      setLoading(true);
      setError(null);
      try {
        // suporta resposta como objeto direto OU { item } OU { data }
        const res = await api.get(`/films/${id}`);
        const payload = res?.data ?? null;
        const item =
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? (payload.item ?? payload)
            : null;

        if (!alive) return;

        if (!item || !item.id) {
          setFilm(null);
          setError("Filme não encontrado.");
        } else {
          setFilm(item);
        }
      } catch (err) {
        if (!alive) return;
        const status = err?.response?.status;
        if (status === 404) {
          setFilm(null);
          setError("Filme não encontrado (404).");
        } else {
          setError(`Falha ao carregar filme. ${status ? `Status: ${status}` : ""}`);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (id) loadFilm();
    else {
      setError("ID do filme ausente.");
      setLoading(false);
    }

    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return <div className="p-8">Carregando filme {id}...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/films"><Button>Voltar aos filmes</Button></Link>
      </div>
    );
  }

  if (!film) {
    return (
      <div className="p-8">
        <p>Filme não encontrado.</p>
        <Link to="/films"><Button>Voltar aos filmes</Button></Link>
      </div>
    );
  }

  // campos do backend atual (com fallbacks):
  const title = film.title ?? "Sem título";
  const year = film.year ?? null;
  const synopsis = film.synopsis ?? film.description ?? ""; // aceita description se vier
  const cover = film.coverUrl ?? film.cover_url ?? null;

  // listas opcionais (se um dia existir no payload)
  const tags = Array.isArray(film.tags) ? film.tags : [];
  const actors = Array.isArray(film.actors) ? film.actors : [];
  const genres = Array.isArray(film.genres) ? film.genres : [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex gap-6">
        {cover ? (
          <img
            src={cover}
            alt={`Capa de ${title}`}
            className="w-48 h-72 object-cover rounded shadow"
            loading="lazy"
          />
        ) : (
          <div className="w-48 h-72 bg-gray-200 rounded grid place-content-center text-gray-500">
            Sem capa
          </div>
        )}

        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">
            {title} {year ? <span className="text-gray-500">({year})</span> : null}
          </h1>

          {synopsis && (
            <p className="text-gray-800 mb-4 whitespace-pre-wrap">{synopsis}</p>
          )}

          {!!genres.length && (
            <div className="mb-3">
              <strong>Gêneros:</strong>{" "}
              <span className="text-gray-700">{genres.join(", ")}</span>
            </div>
          )}

          {!!tags.length && (
            <div className="mb-3">
              <strong>Tags:</strong>{" "}
              <span className="text-gray-700">{tags.join(", ")}</span>
            </div>
          )}

          {!!actors.length && (
            <div className="mb-3">
              <strong>Elenco:</strong>
              <ul className="list-disc ml-6 mt-1">
                {actors.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <Link to="/films"><Button>Voltar aos filmes</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}