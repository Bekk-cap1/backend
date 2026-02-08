import { z } from 'zod';

export const currencySchema = z.string().min(3).max(3).transform((value) => value.toUpperCase());

export const moneySchema = z.object({
  amount: z.number().int().nonnegative(),
  currency: currencySchema.default('UZS'),
});

export type MoneyInput = z.infer<typeof moneySchema>;

