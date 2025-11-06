import { prisma } from "../../db/prisma.js";
function slugify(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function uniqueSlug(base: string) {
  let slug = base || "pessoa", i = 1;
  while (await prisma.person.findFirst({ where: { slug } })) slug = `${base}-${i++}`;
  return slug;
}
export function listPeople() {
  return prisma.person.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, photoUrl: true } });
}
export async function createPerson(data: { name: string; photoUrl?: string }) {
  const slug = await uniqueSlug(slugify(data.name));
  return prisma.person.create({
    data: { name: data.name.trim(), slug, photoUrl: data.photoUrl },
    select: { id: true, name: true, slug: true, photoUrl: true },
  });
}
export function deletePerson(id: string) {
  return prisma.person.delete({ where: { id } });
}
