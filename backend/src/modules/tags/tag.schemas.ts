import { z } from "zod";
export const CreateTagSchema = z.object({ name: z.string().trim().min(1) });
export type CreateTagInput = z.infer<typeof CreateTagSchema>;
