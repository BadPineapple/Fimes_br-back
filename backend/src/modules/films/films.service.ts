// modules/films/films.service.ts
import { prisma } from '../../db/prisma.js';

function slugify(str: string) {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uniqueSlug(base: string) {
  let slug = base || 'filme';
  let i = 1;
  // tenta até achar um slug livre
  while (true) {
    const found = await prisma.film.findFirst({ where: { slug } });
    if (!found) return slug;
    slug = `${base}-${i++}`;
  }
}

/** Listagem paginada (busca por title/originalTitle) */
export function listFilms(q?: string, page = 1, pageSize = 20) {
  const where = q
    ? {
        OR: [
          { title: { contains: q} },
          { originalTitle: { contains: q} },
        ],
      }
    : {};

  return prisma.film.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { year: 'desc' }, { title: 'asc' }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      slug: true,
      title: true,
      originalTitle: true,
      year: true,
      runtimeMin: true,
      coverUrl: true,
      createdAt: true,
    },
  });
}

/** Contagem para paginação */
export function countFilms(q?: string) {
  const where = q
    ? {
        OR: [
          { title: { contains: q } },
          { originalTitle: { contains: q } },
        ],
      }
    : {};
  return prisma.film.count({ where });
}

/** Detalhe por ID ou por slug */
export async function getFilmByIdOrSlug(idOrSlug: string) {
  // tenta como ID primeiro
  const byId = await prisma.film.findUnique({
    where: { id: idOrSlug },
  });
  if (byId) return byId;

  // depois tenta como slug
  return prisma.film.findFirst({
    where: { slug: idOrSlug },
  });
}

/** Criação de filme (gera slug único automaticamente) */
export async function createFilm(data: {
  title: string;
  originalTitle?: string;
  year?: number | null;
  runtimeMin?: number | null;
  synopsis: string;
  coverUrl?: string;
}) {
  const base = slugify(`${data.title}-${data.year ?? ''}`.trim()) || slugify(data.title);
  const slug = await uniqueSlug(base);

  return prisma.film.create({
    data: {
      title: data.title,
      originalTitle: data.originalTitle || null,
      year: data.year ?? null,
      runtimeMin: data.runtimeMin ?? null,
      synopsis: data.synopsis,
      coverUrl: data.coverUrl,
      slug,
    },
    select: { id: true, slug: true, title: true, year: true },
  });
}

/** Atualização (não altera slug para preservar URLs) */
export function updateFilm(
  id: string,
  data: {
    title?: string;
    originalTitle?: string;
    year?: number | null;
    runtimeMin?: number | null;
    synopsis?: string;
    coverUrl?: string;
  }
) {
  return prisma.film.update({
    where: { id },
    data: {
      title: data.title,
      originalTitle: data.originalTitle,
      year: data.year ?? null,
      runtimeMin: data.runtimeMin ?? null,
      synopsis: data.synopsis,
      coverUrl: data.coverUrl,
      // slug permanece inalterado
    },
  });
}

/** Exclusão */
export function deleteFilm(id: string) {
  return prisma.film.delete({ where: { id } });
}

/** Busca leve para autocomplete (SelectFilm) */
export function searchFilms(q: string) {
  return prisma.film.findMany({
    where: {
      OR: [
        { title: { contains: q } },
        { originalTitle: { contains: q} },
      ],
    },
    orderBy: [{ year: 'desc' }, { title: 'asc' }],
    select: { id: true, title: true, year: true, slug: true },
    take: 20,
  });
}
