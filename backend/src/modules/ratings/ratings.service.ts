// modules/ratings/ratings.service.ts
import { prisma } from "../../db/prisma.js";

export async function listRatingsForFilm(filmId: string) {
  const rows = await prisma.rating.findMany({
    where: { filmId },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true, isPrivate: true } },
    },
  });

  // Normaliza para o formato que o front já está esperando (user_id, user_name, user_avatar)
  return rows.map((r) => ({
    id: r.id,
    user_id: r.userId,
    user_name: r.user?.isPrivate ? "Usuário" : (r.user?.name ?? "Usuário"),
    user_avatar: r.user?.avatarUrl ?? null,
    rating: r.score,
    comment: r.comment ?? "",
    createdAt: r.createdAt,
  }));
}

export async function ratingAverageForFilm(filmId: string) {
  const agg = await prisma.rating.aggregate({
    where: { filmId },
    _avg: { score: true },
    _count: { _all: true },
  });
  return {
    average: Number(agg._avg.score ?? 0),
    count: Number(agg._count?._all ?? 0),
  };
}

export function getUserRatingForFilm(userId: string, filmId: string) {
  return prisma.rating.findUnique({
    where: { userId_filmId: { userId, filmId } },
    select: { id: true, score: true, comment: true, createdAt: true },
  });
}

export function upsertUserRatingForFilm(params: {
  userId: string;
  filmId: string;
  rating: number;
  comment?: string | null;
}) {
  const { userId, filmId, rating, comment } = params;
  return prisma.rating.upsert({
    where: { userId_filmId: { userId, filmId } },
    update: { score: rating, comment: comment ?? null },
    create: { userId, filmId, score: rating, comment: comment ?? null },
    select: { id: true, score: true, comment: true, createdAt: true },
  });
}

export function deleteUserRatingForFilm(userId: string, filmId: string) {
  return prisma.rating.delete({
    where: { userId_filmId: { userId, filmId } },
  });
}
