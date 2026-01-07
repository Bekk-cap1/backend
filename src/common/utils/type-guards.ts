export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const hasKey = <K extends string>(
  value: unknown,
  key: K,
): value is Record<K, unknown> => isRecord(value) && key in value;
