import { hasKey, isRecord } from './type-guards';

export type PrismaError = {
  code?: string;
  meta?: unknown;
};

export const isPrismaError = (error: unknown): error is PrismaError => {
  if (!isRecord(error)) return false;
  if (!hasKey(error, 'code')) return false;
  return typeof error.code === 'string';
};
