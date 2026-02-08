export function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const maybe = payload as { data?: unknown };
    if (maybe.data && typeof maybe.data === 'object' && 'data' in (maybe.data as Record<string, unknown>)) {
      return (maybe.data as { data: T }).data;
    }
    return maybe.data as T;
  }
  return payload as T;
}
