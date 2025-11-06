import { z } from "zod";
export const CreatePlatformSchema = z.object({
  name: z.string().trim().min(1),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
});
export type CreatePlatformInput = z.infer<typeof CreatePlatformSchema>;
