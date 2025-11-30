/* prisma/seed.ts */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/** remove acentos, espaços, etc. */
function slugify(str: string) {
  return (str ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base: string) {
  let slug = base || "item";
  let i = 1;
  while (await prisma.film.findFirst({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

async function main() {
  // ---------- LIMPA TABELAS (ordem importa!)
  await prisma.filmAvailability.deleteMany({});
  await prisma.filmPerson.deleteMany({});
  await prisma.filmTag.deleteMany({});
  await prisma.filmGenre.deleteMany({});
  await prisma.rating.deleteMany({});
  await prisma.film.deleteMany({});
  await prisma.genre.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.person.deleteMany({});
  await prisma.streamingPlatform.deleteMany({});

  // ---------- BASES
  const genresSeed = [
    "Drama",
    "Crime",
    "Ação",
    "Suspense",
    "Aventura",
    "Ficção Científica",
  ];
  const tagsSeed = [
    "Clássico",
    "Premiado",
    "Independente",
    "Nordeste",
    "Favela",
    "Estrada",
  ];

  const peopleSeed = [
    { name: "Fernando Meirelles" },
    { name: "Kátia Lund" },
    { name: "Alexandre Rodrigues" },
    { name: "Leandro Firmino" },
    { name: "Kleber Mendonça Filho" },
    { name: "Juliano Dornelles" },
    { name: "Sônia Braga" },
    { name: "Udo Kier" },
    { name: "Walter Salles" },
    { name: "Fernanda Montenegro" },
    { name: "Vinícius de Oliveira" },
  ];

  const platformsSeed = [
    { name: "Globoplay", website: "https://globoplay.globo.com/" },
    { name: "Netflix", website: "https://www.netflix.com/" },
    { name: "Prime Video", website: "https://www.primevideo.com/" },
  ];

  // ---------- INSERT GÊNEROS
  const genreMap: Record<string, string> = {};
  for (const name of genresSeed) {
    const g = await prisma.genre.create({
      data: { name, slug: slugify(name) },
      select: { id: true, name: true },
    });
    genreMap[g.name] = g.id;
  }

  // ---------- INSERT TAGS
  const tagMap: Record<string, string> = {};
  for (const name of tagsSeed) {
    const t = await prisma.tag.create({
      data: { name, slug: slugify(name) },
      select: { id: true, name: true },
    });
    tagMap[t.name] = t.id;
  }

  // ---------- INSERT PESSOAS
  const personMap: Record<string, string> = {};
  for (const p of peopleSeed) {
    const created = await prisma.person.create({
      data: { name: p.name, slug: slugify(p.name) },
      select: { id: true, name: true },
    });
    personMap[created.name] = created.id;
  }

  // ---------- INSERT PLATAFORMAS
  const platformMap: Record<string, string> = {};
  for (const p of platformsSeed) {
    const created = await prisma.streamingPlatform.create({
      data: { name: p.name, slug: slugify(p.name), website: p.website },
      select: { id: true, name: true },
    });
    platformMap[created.name] = created.id;
  }

  // ---------- FILMES (dados de exemplo)
  type FilmSeed = {
    title: string;
    originalTitle?: string;
    year?: number;
    runtimeMin?: number;
    synopsis?: string;
    coverUrl?: string;
    genres?: string[];
    tags?: string[];
    directors?: string[]; // nomes das pessoas
    cast?: Array<{ name: string; characterName?: string; billingOrder?: number }>;
    availability?: Array<{ platform: string; type: "SUBSCRIPTION" | "RENT" | "BUY" | "FREE"; region?: string; url?: string }>;
  };

  const filmsSeed: FilmSeed[] = [
    {
      title: "Cidade de Deus",
      year: 2002,
      runtimeMin: 130,
      synopsis:
        "Na violenta favela carioca, Buscapé cresce entre o crime e tenta se tornar fotógrafo, enquanto Zé Pequeno ascende no tráfico.",
      genres: ["Crime", "Drama", "Ação"],
      tags: ["Clássico", "Favela", "Premiado"],
      directors: ["Fernando Meirelles", "Kátia Lund"],
      cast: [
        { name: "Alexandre Rodrigues", characterName: "Buscapé", billingOrder: 1 },
        { name: "Leandro Firmino", characterName: "Zé Pequeno", billingOrder: 2 },
      ],
      availability: [
        { platform: "Globoplay", type: "SUBSCRIPTION", region: "BR" },
        { platform: "Prime Video", type: "RENT", region: "BR" },
      ],
      coverUrl: "https://image.tmdb.org/t/p/w780/k7eYdWvhYQyRQoU2TB2A2Xu2TfD.jpg",
    },
    {
      title: "Bacurau",
      year: 2019,
      runtimeMin: 131,
      synopsis:
        "Após a morte de Dona Carmelita, moradores de Bacurau descobrem que sua comunidade foi apagada do mapa e passa a ser caçada.",
      genres: ["Suspense", "Aventura", "Drama"],
      tags: ["Independente", "Nordeste", "Premiado"],
      directors: ["Kleber Mendonça Filho", "Juliano Dornelles"],
      cast: [
        { name: "Sônia Braga", characterName: "Domingas", billingOrder: 1 },
        { name: "Udo Kier", characterName: "Michael", billingOrder: 2 },
      ],
      availability: [
        { platform: "Globoplay", type: "SUBSCRIPTION", region: "BR" },
        { platform: "Prime Video", type: "BUY", region: "BR" },
      ],
      coverUrl: "https://image.tmdb.org/t/p/w780/wvC4jG3EjjXNMT1UM3GqXWfY5qY.jpg",
    },
    {
      title: "Central do Brasil",
      year: 1998,
      runtimeMin: 110,
      synopsis:
        "Dora e o menino Josué viajam pelo interior do Nordeste em busca do pai do garoto, criando laços de afeto ao longo do caminho.",
      genres: ["Drama", "Aventura"],
      tags: ["Estrada", "Clássico"],
      directors: ["Walter Salles"],
      cast: [
        { name: "Fernanda Montenegro", characterName: "Dora", billingOrder: 1 },
        { name: "Vinícius de Oliveira", characterName: "Josué", billingOrder: 2 },
      ],
      availability: [
        { platform: "Netflix", type: "SUBSCRIPTION", region: "BR" },
      ],
      coverUrl: "https://image.tmdb.org/t/p/w780/1NE2x6Qlm5A3hneMuquMNFc13JU.jpg",
    },
  ];

  // ---------- CRIA FILMES E RELAÇÕES
  for (const f of filmsSeed) {
    const base = slugify(`${f.title}-${f.year ?? ""}`.trim()) || slugify(f.title);
    const slug = await uniqueSlug(base);

    const film = await prisma.film.create({
      data: {
        title: f.title,
        originalTitle: f.originalTitle ?? null,
        year: f.year ?? null,
        runtimeMin: f.runtimeMin ?? null,
        synopsis: f.synopsis ?? null,
        coverUrl: f.coverUrl ?? null,
        slug,
      },
      select: { id: true, title: true },
    });

    // gêneros
    for (const gName of f.genres ?? []) {
      const genreId = genreMap[gName];
      if (genreId) {
        await prisma.filmGenre.upsert({
          where: { filmId_genreId: { filmId: film.id, genreId } },
          update: {},
          create: { filmId: film.id, genreId },
        });
      }
    }

    // tags
    for (const tName of f.tags ?? []) {
      const tagId = tagMap[tName];
      if (tagId) {
        await prisma.filmTag.upsert({
          where: { filmId_tagId: { filmId: film.id, tagId } },
          update: {},
          create: { filmId: film.id, tagId },
        });
      }
    }

    // direção
    for (const dName of f.directors ?? []) {
      const personId = personMap[dName];
      if (personId) {
        await prisma.filmPerson.upsert({
          where: { filmId_personId_role: { filmId: film.id, personId, role: "DIRECTOR" as any } },
          update: {},
          create: { filmId: film.id, personId, role: "DIRECTOR" as any },
        });
      }
    }

    // elenco
    for (const c of f.cast ?? []) {
      const personId = personMap[c.name];
      if (personId) {
        await prisma.filmPerson.upsert({
          where: { filmId_personId_role: { filmId: film.id, personId, role: "ACTOR" as any } },
          update: { characterName: c.characterName ?? null, billingOrder: c.billingOrder ?? null },
          create: {
            filmId: film.id,
            personId,
            role: "ACTOR" as any,
            characterName: c.characterName ?? null,
            billingOrder: c.billingOrder ?? null,
          },
        });
      }
    }

    // onde assistir
    for (const a of f.availability ?? []) {
      const platformId = platformMap[a.platform];
      if (platformId) {
        await prisma.filmAvailability.upsert({
          where: { filmId_platformId_type: { filmId: film.id, platformId, type: a.type as any } },
          update: { region: a.region ?? null, url: a.url ?? null, lastCheck: new Date() },
          create: {
            filmId: film.id,
            platformId,
            type: a.type as any, // "SUBSCRIPTION" | "RENT" | "BUY" | "FREE"
            region: a.region ?? null,
            url: a.url ?? null,
            lastCheck: new Date(),
          },
        });
      }
    }
  }

  console.log("✅ Seed concluída com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
