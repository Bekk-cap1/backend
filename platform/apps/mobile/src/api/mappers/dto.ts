export function unwrapPayload<T>(payload: unknown): T {
  let current = payload;

  for (let i = 0; i < 5; i += 1) {
    if (!current || typeof current !== 'object') break;
    if (!('data' in current)) break;

    const obj = current as Record<string, unknown>;
    const keys = Object.keys(obj);
    const isEnvelopeLayer =
      keys.length === 1 ||
      'ok' in obj ||
      'meta' in obj ||
      'error' in obj ||
      'statusCode' in obj;

    if (!isEnvelopeLayer) break;
    current = obj.data;
  }

  return current as T;
}

export function unwrapItems<T>(payload: unknown): T[] {
  const data = unwrapPayload<unknown>(payload);

  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === 'object') {
    const maybeItems = data as { items?: unknown; data?: unknown };
    if (Array.isArray(maybeItems.items)) {
      return maybeItems.items as T[];
    }
    if (Array.isArray(maybeItems.data)) {
      return maybeItems.data as T[];
    }
  }

  return [];
}
