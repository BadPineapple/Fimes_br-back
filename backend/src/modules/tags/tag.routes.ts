import { FastifyInstance } from "fastify";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { CreateTagSchema } from "./tag.schemas.js";
import { listTags, createTag, deleteTag } from "./tag.service.js";

export async function tagRoutes(app: FastifyInstance) {
  app.get("/tags", async () => ({ items: await listTags() }));
  app.post("/tags", { preHandler: [requireAuth, requireRole("moderator")] }, async (req, reply) => {
    const p = CreateTagSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.format() });
    return reply.code(201).send(await createTag(p.data));
  });
  app.delete("/tags/:id", { preHandler: [requireAuth, requireRole("moderator")] }, async (req) => {
    const { id } = req.params as { id: string };
    await deleteTag(id);
    return { ok: true };
  });
}
