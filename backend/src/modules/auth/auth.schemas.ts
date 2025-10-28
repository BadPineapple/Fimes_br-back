import { z } from 'zod';

export const LoginBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional()
});

export type LoginBody = z.infer<typeof LoginBody>;
