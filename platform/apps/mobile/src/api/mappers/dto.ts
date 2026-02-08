export function unwrapPayload<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
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
