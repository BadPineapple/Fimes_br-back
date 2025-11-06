import { z } from "zod";
export const CreatePersonSchema = z.object({
  name: z.string().trim().min(1),
  photoUrl: z.string().url().optional(),
});
export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
