import { FastifyInstance } from "fastify";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { CreatePlatformSchema } from "./platforms.schemas.js";
import { listPlatforms, createPlatform, deletePlatform } from "./platforms.service.js";

export async function platformRoutes(app: FastifyInstance) {
  app.get("/platforms", async () => ({ items: await listPlatforms() }));
  app.post("/platforms", { preHandler: [requireAuth, requireRole("moderator")] }, async (req, reply) => {
    const p = CreatePlatformSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.format() });
    return reply.code(201).send(await createPlatform(p.data));
  });
  app.delete("/platforms/:id", { preHandler: [requireAuth, requireRole("moderator")] }, async (req) => {
    const { id } = req.params as { id: string };
    await deletePlatform(id);
    return { ok: true };
  });
}
