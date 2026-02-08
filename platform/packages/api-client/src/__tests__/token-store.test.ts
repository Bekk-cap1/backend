import { describe, expect, it } from 'vitest';
import { MemoryTokenStore, StorageTokenStore } from '../core/token-store';

describe('MemoryTokenStore', () => {
  it('stores and clears tokens', async () => {
    const store = new MemoryTokenStore();

    await store.setTokens({ accessToken: 'a', refreshToken: 'r' });
    expect(await store.getAccessToken()).toBe('a');
    expect(await store.getRefreshToken()).toBe('r');

    await store.clear();
    expect(await store.getAccessToken()).toBeNull();
    expect(await store.getRefreshToken()).toBeNull();
  });

  it('works with custom storage adapter', async () => {
    const backing = new Map<string, string>();
    const store = new StorageTokenStore({
      getItem: (key) => backing.get(key) ?? null,
      setItem: (key, value) => {
        backing.set(key, value);
      },
      removeItem: (key) => {
        backing.delete(key);
      },
    });

    await store.setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    expect(await store.getAccessToken()).toBe('access-1');
    expect(await store.getRefreshToken()).toBe('refresh-1');

    await store.clear();
    expect(await store.getAccessToken()).toBeNull();
    expect(await store.getRefreshToken()).toBeNull();
  });
});
