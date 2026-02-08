import AsyncStorage from '@react-native-async-storage/async-storage';

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(`cache:${key}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() > parsed.expiresAt) {
      await AsyncStorage.removeItem(`cache:${key}`);
      return null;
    }
    return parsed.value as T;
  } catch {
    return null;
  }
}

export async function setCached(key: string, value: unknown, ttlMs: number) {
  const payload: CacheEntry = {
    value,
    expiresAt: Date.now() + ttlMs,
  };
  await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(payload));
}
