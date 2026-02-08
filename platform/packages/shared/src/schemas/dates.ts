import { z } from 'zod';

export const isoDateStringSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime())
  .transform((value) => new Date(value).toISOString());

export const dateRangeSchema = z
  .object({
    from: isoDateStringSchema,
    to: isoDateStringSchema,
  })
  .refine((value) => new Date(value.from) <= new Date(value.to), {
    message: '`from` date must be earlier than or equal to `to` date',
    path: ['to'],
  });

export type DateRangeInput = z.infer<typeof dateRangeSchema>;

