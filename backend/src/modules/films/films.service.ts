import { prisma } from '../../db/prisma.js';

export function listFilms(q?: string, page = 1, pageSize = 20) {
  const where = q
    ? { title: { contains: q, mode: 'insensitive' as const } }
    : {};
  return prisma.film.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize
  });
}

export function countFilms(q?: string) {
  const where = q
    ? { title: { contains: q, mode: 'insensitive' as const } }
    : {};
  return prisma.film.count({ where });
}

export function getFilm(id: string) {
  return prisma.film.findUnique({ where: { id } });
}

export function createFilm(data: {
  title: string; year?: number; synopsis?: string; coverUrl?: string;
}) {
  return prisma.film.create({ data });
}

export function updateFilm(id: string, data: {
  title?: string; year?: number; synopsis?: string; coverUrl?: string;
}) {
  return prisma.film.update({ where: { id }, data });
}

export function deleteFilm(id: string) {
  return prisma.film.delete({ where: { id } });
}
