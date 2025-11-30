// src/modules/ratings/ratings.routes.ts
import { FastifyInstance } from "fastify";
import { requireAuth } from "../../middlewares/auth.js";
import { resolveFilmId } from "../films/films.utils.js";
import { CreateOrUpdateRatingSchema } from "./ratings.schemas.js";
import {
  listRatingsForFilm,
  ratingAverageForFilm,
  getUserRatingForFilm,
  upsertUserRatingForFilm,
  deleteUserRatingForFilm,
} from "./ratings.service.js";

export async function ratingsRoutes(app: FastifyInstance) {
  // Listar avaliações de um filme
  app.get("/films/:id/ratings", async (req, reply) => {
    const { id } = req.params as { id: string };
    const filmId = await resolveFilmId(id);
    if (!filmId) return reply.code(404).send({ error: "Film not found" });

    const items = await listRatingsForFilm(filmId);
    return items;
  });

  // Média e contagem
  app.get("/films/:id/ratings/average", async (req, reply) => {
    const { id } = req.params as { id: string };
    const filmId = await resolveFilmId(id);
    if (!filmId) return reply.code(404).send({ error: "Film not found" });

    const data = await ratingAverageForFilm(filmId);
    return data; // { average, count }
  });

  // Minha avaliação (autenticado)
  app.get("/films/:id/ratings/me", { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const filmId = await resolveFilmId(id);
    if (!filmId) return reply.code(404).send({ error: "Film not found" });

    const userId = (req as any).user?.id as string;
    const mine = await getUserRatingForFilm(userId, filmId);
    return mine ?? null;
  });

  // Criar/atualizar minha avaliação
  app.post("/films/:id/ratings", { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const filmId = await resolveFilmId(id);
    if (!filmId) return reply.code(404).send({ error: "Film not found" });

    const parsed = CreateOrUpdateRatingSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() });

    const userId = (req as any).user?.id as string;
    const saved = await upsertUserRatingForFilm({
      userId,
      filmId,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    });
    return reply.code(201).send(saved);
  });

  // Remover minha avaliação
  app.delete("/films/:id/ratings", { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const filmId = await resolveFilmId(id);
    if (!filmId) return reply.code(404).send({ error: "Film not found" });

    const userId = (req as any).user?.id as string;
    const exists = await getUserRatingForFilm(userId, filmId);
    if (!exists) return reply.code(204).send();
    await deleteUserRatingForFilm(userId, filmId);
    return reply.code(204).send();
  });
}
