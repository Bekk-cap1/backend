import { describe, expect, it } from 'vitest';
import { StorageTokenStore } from '@platform/api-client';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe('token-store adapter', () => {
  it('stores and clears access/refresh tokens', async () => {
    const storage = createMemoryStorage();
    const store = new StorageTokenStore(storage, {
      accessKey: 'access',
      refreshKey: 'refresh',
    });

    await store.setTokens({ accessToken: 'a1', refreshToken: 'r1' });

    expect(await store.getAccessToken()).toBe('a1');
    expect(await store.getRefreshToken()).toBe('r1');

    await store.clear();

    expect(await store.getAccessToken()).toBeNull();
    expect(await store.getRefreshToken()).toBeNull();
  });
});
