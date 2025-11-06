import { prisma } from "../../db/prisma.js";
function slugify(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function uniqueSlug(base: string) {
  let slug = base || "tag", i = 1;
  while (await prisma.tag.findFirst({ where: { slug } })) slug = `${base}-${i++}`;
  return slug;
}
export function listTags() {
  return prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } });
}
export async function createTag(data: { name: string }) {
  const slug = await uniqueSlug(slugify(data.name));
  return prisma.tag.create({ data: { name: data.name.trim(), slug }, select: { id: true, name: true, slug: true } });
}
export function deleteTag(id: string) {
  return prisma.tag.delete({ where: { id } });
}
