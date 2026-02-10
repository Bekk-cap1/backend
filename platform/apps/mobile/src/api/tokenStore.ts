import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { AuthTokens, TokenStore } from '@platform/api-client';

const ACCESS_KEY = 'mobile_access_token';
const REFRESH_KEY = 'mobile_refresh_token';

async function getItem(key: string) {
  if (Platform.OS !== 'web') {
    try {
      const secure = await SecureStore.getItemAsync(key);
      if (secure) return secure;
    } catch {
      // SecureStore can be unavailable in some runtimes.
    }
  }

  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string) {
  if (Platform.OS !== 'web') {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Fallback to AsyncStorage when SecureStore fails.
    }
  }

  await AsyncStorage.setItem(key, value);
}

async function removeItem(key: string) {
  if (Platform.OS !== 'web') {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Fallback to AsyncStorage when SecureStore fails.
    }
  }

  await AsyncStorage.removeItem(key);
}

class MobileTokenStore implements TokenStore {
  async getAccessToken() {
    return getItem(ACCESS_KEY);
  }

  async getRefreshToken() {
    return getItem(REFRESH_KEY);
  }

  async setTokens(tokens: AuthTokens) {
    await setItem(ACCESS_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      await setItem(REFRESH_KEY, tokens.refreshToken);
    } else {
      await removeItem(REFRESH_KEY);
    }
  }

  async clear() {
    await removeItem(ACCESS_KEY);
    await removeItem(REFRESH_KEY);
  }
}

export const mobileTokenStore = new MobileTokenStore();
