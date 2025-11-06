import { prisma } from "../../db/prisma.js";
function slugify(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function uniqueSlug(base: string) {
  let slug = base || "plataforma", i = 1;
  while (await prisma.streamingPlatform.findFirst({ where: { slug } })) slug = `${base}-${i++}`;
  return slug;
}
export function listPlatforms() {
  return prisma.streamingPlatform.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, website: true, logoUrl: true },
  });
}
export async function createPlatform(data: { name: string; website?: string; logoUrl?: string }) {
  const slug = await uniqueSlug(slugify(data.name));
  return prisma.streamingPlatform.create({
    data: { name: data.name.trim(), slug, website: data.website, logoUrl: data.logoUrl },
    select: { id: true, name: true, slug: true, website: true, logoUrl: true },
  });
}
export function deletePlatform(id: string) {
  return prisma.streamingPlatform.delete({ where: { id } });
}
