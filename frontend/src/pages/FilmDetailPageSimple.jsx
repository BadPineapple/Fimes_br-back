import React from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

export default function FilmDetailPageSimple() {
  const { id } = useParams();
  const [film, setFilm] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const loadFilm = async () => {
      try {
        console.log("=== DEBUG FILM LOADING ===");
        console.log("Film ID from URL:", id);
        console.log("API Base URL:", api.defaults.baseURL);
        console.log("Full URL:", `${api.defaults.baseURL}/films/${id}`);
        
        const response = await api.get(`/films/${id}`);
        console.log("API Response:", response);
        console.log("Film data:", response.data);
        setFilm(response.data);
      } catch (err) {
        console.error("=== ERROR DETAILS ===");
        console.error("Error message:", err.message);
        console.error("Error response:", err.response);
        console.error("Error status:", err.response?.status);
        console.error("Error config:", err.config);
        setError(`${err.message} - Status: ${err.response?.status || 'N/A'}`);
      }
      setLoading(false);
    };

    if (id) {
      loadFilm();
    } else {
      console.error("No ID provided!");
      setError("No film ID provided");
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return <div className="p-8">Carregando filme {id}...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Erro: {error}</div>;
  }

  if (!film) {
    return <div className="p-8">Filme não encontrado</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">{film.title}</h1>
      <p className="mb-2"><strong>Ano:</strong> {film.year}</p>
      <p className="mb-2"><strong>Diretor:</strong> {film.director}</p>
      <p className="mb-4"><strong>Descrição:</strong> {film.description}</p>
      <div className="mb-4">
        <strong>Gêneros:</strong>
        <div className="flex gap-2 mt-2">
          {(film.tags || []).map((tag, i) => (
            <span key={i} className="bg-blue-100 px-3 py-1 rounded">{tag}</span>
          ))}
        </div>
      </div>
      {film.actors && film.actors.length > 0 && (
        <div className="mb-4">
          <strong>Elenco:</strong>
          <ul className="list-disc ml-6 mt-2">
            {film.actors.map((actor, i) => (
              <li key={i}>{actor}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}