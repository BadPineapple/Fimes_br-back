import { FastifyInstance } from 'fastify';
import { FilmCreate, FilmUpdate } from './films.schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import {
  listFilms, countFilms, getFilm, createFilm, updateFilm, deleteFilm
} from './films.service.js';

export async function filmRoutes(app: FastifyInstance) {
  app.get('/films', async (req, reply) => {
    const q = (req.query as any)?.q as string | undefined;
    const page = Number((req.query as any)?.page ?? 1);
    const pageSize = Number((req.query as any)?.pageSize ?? 20);

    const [items, total] = await Promise.all([
      listFilms(q, page, pageSize),
      countFilms(q)
    ]);

    return { items, page, pageSize, total };
  });

  app.get('/films/featured', async () => {
    const items = await listFilms(undefined, 1, 12); // 12 mais recentes
    return { items };
  });

  app.get('/films/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const film = await getFilm(id);
    if (!film) return reply.code(404).send({ error: 'Not found' });
    return film;
  });

  // cria/edita/exclui: exige auth; para exemplo, restringe criar/editar para 'moderator'
  app.post('/films', { preHandler: [requireAuth, requireRole('moderator')] }, async (req, reply) => {
    const parsed = FilmCreate.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() });
    const film = await createFilm(parsed.data);
    return reply.code(201).send(film);
  });

  app.put('/films/:id', { preHandler: [requireAuth, requireRole('moderator')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = FilmUpdate.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.format() });
    const film = await updateFilm(id, parsed.data);
    return film;
  });

  app.delete('/films/:id', { preHandler: [requireAuth, requireRole('moderator')] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await deleteFilm(id);
    return reply.code(204).send();
  });
}
