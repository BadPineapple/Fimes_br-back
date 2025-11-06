import { prisma } from "../../db/prisma.js";

function slugify(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function uniqueSlug(base: string) {
  let slug = base || "genero", i = 1;
  while (await prisma.genre.findFirst({ where: { slug } })) slug = `${base}-${i++}`;
  return slug;
}

export function listGenres() {
  return prisma.genre.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } });
}
export async function createGenre(data: { name: string }) {
  const base = slugify(data.name);
  const slug = await uniqueSlug(base);
  return prisma.genre.create({ data: { name: data.name.trim(), slug }, select: { id: true, name: true, slug: true } });
}
export function deleteGenre(id: string) {
  return prisma.genre.delete({ where: { id } });
}
