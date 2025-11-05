import { z } from 'zod';

// CREATE / UPDATE
export const FilmCreate = z.object({
  title: z.string().trim().min(1),

  originalTitle: z.string().trim().optional(),

  year: z.coerce.number().int().min(1895).max(2100).nullable().optional(),

  runtimeMin: z.coerce.number().int().positive().max(1000).nullable().optional(),

  synopsis: z.string().trim().min(1),

  // o front já envia undefined quando vazio; aqui só validamos URL quando vier
  coverUrl: z.string().trim().url().optional(),
});

export const FilmUpdate = FilmCreate.partial();

// GET /films/search?q=...
export const SearchFilmsQuery = z.object({
  q: z.string().trim().min(1),
});

export type FilmCreate = z.infer<typeof FilmCreate>;
export type FilmUpdate = z.infer<typeof FilmUpdate>;
export type SearchFilmsQuery = z.infer<typeof SearchFilmsQuery>;
