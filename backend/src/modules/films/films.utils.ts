// modules/films/films.utils.ts
import { prisma } from "../../db/prisma.js";

export async function resolveFilmId(idOrSlug: string) {
  const byId = await prisma.film.findUnique({ where: { id: idOrSlug }, select: { id: true } });
  if (byId) return byId.id;
  const bySlug = await prisma.film.findFirst({ where: { slug: idOrSlug }, select: { id: true } });
  return bySlug?.id ?? null;
}
