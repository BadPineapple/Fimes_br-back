import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FilmCreate, FilmUpdate } from './films.schemas.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import {
  listFilms,
  countFilms,
  getFilmByIdOrSlug,   // ← novo
  createFilm,
  updateFilm,
  deleteFilm,
  searchFilms          // ← novo
} from './films.service.js';

export async function filmRoutes(app: FastifyInstance) {
  // Listagem paginada + busca livre
  app.get('/films', async (req, reply) => {
    const q = (req.query as any)?.q as string | undefined;
    const page = Number((req.query as any)?.page ?? 1);
    const pageSize = Number((req.query as any)?.pageSize ?? 20);

    const [items, total] = await Promise.all([
      listFilms(q, page, pageSize),
      countFilms(q),
    ]);

    return { items, page, pageSize, total };
  });

  // Destaques (mais recentes)
  app.get('/films/featured', async () => {
    const items = await listFilms(undefined, 1, 12);
    return { items };
  });

  // Busca leve para autocompletar (SelectFilm)
  app.get('/films/search', async (req, reply) => {
    const Query = z.object({ q: z.string().trim().min(1) });
    const parsed = Query.safeParse((req.query ?? {}) as any);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.format() });
    }
    const items = await searchFilms(parsed.data.q);
    // retorna já no formato simples
    return { items }; // [{ id, title, year, slug }]
  });

  // Detalhe do filme por ID ou slug
  app.get('/films/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const film = await getFilmByIdOrSlug(id);
    if (!film) return reply.code(404).send({ error: 'Not found' });
    return film;
  });

  // criar (moderador)
  app.post(
    '/films',
    { preHandler: [requireAuth, requireRole('moderator')] },
    async (req, reply) => {
      const parsed = FilmCreate.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.format() });
      }
      const film = await createFilm(parsed.data);
      return reply.code(201).send(film);
    }
  );

  // atualizar (moderador)
  app.put(
    '/films/:id',
    { preHandler: [requireAuth, requireRole('moderator')] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = FilmUpdate.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.format() });
      }
      const film = await updateFilm(id, parsed.data);
      return film;
    }
  );

  // excluir (moderador)
  app.delete(
    '/films/:id',
    { preHandler: [requireAuth, requireRole('moderator')] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      await deleteFilm(id);
      return reply.code(204).send();
    }
  );
}
