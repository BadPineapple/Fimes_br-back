import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { CreateGenreSchema } from "./genres.schemas.js";
import { listGenres, createGenre, deleteGenre } from "./genres.service.js";

export async function genreRoutes(app: FastifyInstance) {
  app.get("/genres", async () => ({ items: await listGenres() }));

  app.post("/genres", { preHandler: [requireAuth, requireRole("moderator")] }, async (req, reply) => {
    const parsed = CreateGenreSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() });
    const g = await createGenre(parsed.data);
    return reply.code(201).send(g);
  });

  app.delete("/genres/:id", { preHandler: [requireAuth, requireRole("moderator")] }, async (req) => {
    const { id } = req.params as { id: string };
    await deleteGenre(id);
    return { ok: true };
  });
}
