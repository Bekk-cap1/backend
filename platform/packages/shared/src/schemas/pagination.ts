import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  total: z.number().int().min(0).optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
