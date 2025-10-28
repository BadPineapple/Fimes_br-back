import { z } from 'zod';

export const FilmCreate = z.object({
  title: z.string().min(1),
  year: z.number().int().optional(),
  synopsis: z.string().optional(),
  coverUrl: z.string().url().optional()
});

export const FilmUpdate = FilmCreate.partial();

export type FilmCreate = z.infer<typeof FilmCreate>;
export type FilmUpdate = z.infer<typeof FilmUpdate>;
