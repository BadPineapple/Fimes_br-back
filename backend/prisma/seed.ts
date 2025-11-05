// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertUser(email: string, data: {
  name?: string | null;
  role?: 'user' | 'moderator' | 'admin';
  avatarUrl?: string | null;
  isSupporter?: boolean;
  isPrivate?: boolean;
  description?: string | null;
}) {
  return prisma.user.upsert({
    where: { email },
    update: {
      name: data.name ?? undefined,
      role: (data.role as any) ?? undefined,
      avatarUrl: data.avatarUrl ?? undefined,
      isSupporter: data.isSupporter ?? undefined,
      isPrivate: data.isPrivate ?? undefined,
      description: data.description ?? undefined,
    },
    create: {
      email,
      name: data.name ?? null,
      role: (data.role as any) ?? 'user',
      avatarUrl: data.avatarUrl ?? null,
      isSupporter: data.isSupporter ?? false,
      isPrivate: data.isPrivate ?? false,
      description: data.description ?? null,
    },
  });
}

async function ensureFilm(data: {
  title: string;
  year?: number;
  synopsis?: string;
  coverUrl?: string;
}) {
  // Como não há unique para filmes, evitamos duplicar procurando por title+year
  const existing = await prisma.film.findFirst({
    where: {
      title: data.title,
      year: data.year ?? null,
    },
  });
  if (existing) return existing;
  return prisma.film.create({ data });
}

async function main() {
  // --- Usuários ---
  const moderator = await upsertUser('moderador@filmes.br', {
    name: 'Moderador',
    role: 'moderator',
    avatarUrl: null,
    description: 'Curadoria e moderação.',
  });

  const ana = await upsertUser('ana@filmes.br', {
    name: 'Ana Souza',
    role: 'user',
    description: 'Apaixonada por cinema nacional.',
  });

  const carlos = await upsertUser('carlos@filmes.br', {
    name: 'Carlos Lima',
    role: 'user',
  });

  console.log('Users:', { moderator: moderator.email, ana: ana.email, carlos: carlos.email });

  // --- Filmes (10) ---
  const films = [
    {
      title: 'Cidade de Deus',
      year: 2002,
      synopsis:
        'Dois jovens crescem na favela Cidade de Deus, no Rio de Janeiro, trilhando caminhos opostos entre fotografia e crime.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/k7eYdWvhYQyRQoU2TB2A2Xu2TfD.jpg',
    },
    {
      title: 'Central do Brasil',
      year: 1998,
      synopsis:
        'Uma ex-professora ajuda um menino a encontrar o pai no interior do Nordeste após a morte da mãe.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/5TvzHmxsqsYqS9rSLw2wGZ9rW1A.jpg',
    },
    {
      title: 'Tropa de Elite',
      year: 2007,
      synopsis:
        'O cotidiano do BOPE no Rio de Janeiro e o dilema de um capitão prestes a se aposentar.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/qhZqX8G6HC8K3opgDdGztqKqRRm.jpg',
    },
    {
      title: 'Bacurau',
      year: 2019,
      synopsis:
        'Após a morte de Dona Carmelita, moradores de um vilarejo no sertão percebem algo estranho acontecendo.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/9n2tJBplPzg5cZbgr8HUR2E0A0v.jpg',
    },
    {
      title: 'Que Horas Ela Volta?',
      year: 2015,
      synopsis:
        'A chegada da filha da empregada doméstica abala as relações de classe numa casa de São Paulo.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/9m7QbK0rGZWlznImPi0tLxe3LjF.jpg',
    },
    {
      title: 'O Auto da Compadecida',
      year: 2000,
      synopsis:
        'As aventuras de João Grilo e Chicó no sertão nordestino, humor e crítica social.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/8QXGNP0Vb4nsYKub59XpAhiUSQN.jpg',
    },
    {
      title: 'Aquarius',
      year: 2016,
      synopsis:
        'Clara resiste à pressão de uma construtora que quer demolir o prédio onde vive.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/6mVfZq5CV2wAPOQgpdnH3UX77Dp.jpg',
    },
    {
      title: 'Carandiru',
      year: 2003,
      synopsis:
        'A vida no complexo penitenciário de São Paulo às vésperas do massacre de 1992.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/8n3eQZxYQY7m0B6K8ZZrVSu2CeG.jpg',
    },
    {
      title: 'Hoje Eu Quero Voltar Sozinho',
      year: 2014,
      synopsis:
        'Leo, um adolescente cego, descobre sentimentos ao conhecer o novo colega de classe.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/6GCUCJn4n1Z2N1DbStO2Qe6hwMR.jpg',
    },
    {
      title: 'Linha de Passe',
      year: 2008,
      synopsis:
        'Quatro irmãos na periferia de São Paulo lutam por sobrevivência e sonhos.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/1gNn0x2m2kq3Bv9v9jQwXWm3Lyz.jpg',
    },
  ];

  for (const f of films) {
    await ensureFilm(f);
  }

  const totalFilms = await prisma.film.count();
  console.log(`Films total: ${totalFilms}`);

  // (Opcional) crie algumas avaliações para testar
  // await prisma.rating.create({ data: { userId: ana.id, filmId: (await prisma.film.findFirst({ where: { title: 'Cidade de Deus' } }))!.id, score: 5, comment: 'Obra-prima.' } });

  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
