import { z } from 'zod';

export function safeParse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> | null {
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}

