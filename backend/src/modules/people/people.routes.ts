import { FastifyInstance } from "fastify";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { CreatePersonSchema } from "./people.schemas.js";
import { listPeople, createPerson, deletePerson } from "./people.service.js";

export async function peopleRoutes(app: FastifyInstance) {
  app.get("/people", async () => ({ items: await listPeople() }));
  app.post("/people", { preHandler: [requireAuth, requireRole("moderator")] }, async (req, reply) => {
    const p = CreatePersonSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: p.error.format() });
    return reply.code(201).send(await createPerson(p.data));
  });
  app.delete("/people/:id", { preHandler: [requireAuth, requireRole("moderator")] }, async (req) => {
    const { id } = req.params as { id: string };
    await deletePerson(id);
    return { ok: true };
  });
}
