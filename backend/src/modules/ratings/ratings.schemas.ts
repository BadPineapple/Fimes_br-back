// modules/ratings/ratings.schemas.ts
import { z } from "zod";

export const CreateOrUpdateRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(800).optional(),
});

export type CreateOrUpdateRatingInput = z.infer<typeof CreateOrUpdateRatingSchema>;
