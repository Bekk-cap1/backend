import { z } from 'zod';

export const loginSchema = z.object({
  phone: z.string().min(5),
  password: z.string().min(6),
});

export const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
});

export const authUserSchema = z.object({
  id: z.string().optional(),
  sub: z.string().optional(),
  role: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
