// frontend/src/components/FilmCard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Film as FilmIcon, Star } from "lucide-react";

export default function FilmCard({ film }) {
  if (!film) return null;

  const cover = film.poster_url || film.banner_url || null;
  const title = film.title || "Sem título";
  const year = film.year || null;

  // rating preferencial: 'rating' (0–10); fallback: imdb_rating (0–10)
  const ratingRaw =
    typeof film?.rating === "number"
      ? film.rating
      : typeof film?.imdb_rating === "number"
      ? film.imdb_rating
      : null;
  const ratingText = ratingRaw != null ? Number(ratingRaw).toFixed(1) : null;

  const tags = Array.isArray(film.genres) ? film.genres : Array.isArray(film.tags) ? film.tags : [];
  const topTags = tags.slice(0, 2);

  const to = `/films/${film.id}`;
  const aria = `Ver detalhes do filme: ${title}`;

  return (
    <Link to={to} aria-label={aria}>
      <Card
        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        data-testid={`film-card-${film.id}`}
        title={title}
      >
        <div className="aspect-[2/3] bg-gradient-to-br from-green-200 to-yellow-200 relative">
          {cover ? (
            <img
              src={cover}
              alt={`Capa de ${title}`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FilmIcon size={48} className="text-green-600" />
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2 line-clamp-2" data-testid="film-title">
            {title}
          </h3>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            {year && <span>{year}</span>}
            {ratingText && (
              <div className="flex items-center gap-1">
                <Star size={12} className="text-yellow-500" />
                <span>{ratingText}</span>
              </div>
            )}
          </div>

          {topTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {topTags.map((tag, i) => (
                <Badge key={`${tag}-${i}`} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
