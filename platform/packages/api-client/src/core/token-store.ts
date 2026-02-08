export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

export interface TokenStore {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  setTokens(tokens: AuthTokens): Promise<void>;
  clear(): Promise<void>;
}

export interface KeyValueStorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export type StorageTokenStoreOptions = {
  accessKey?: string;
  refreshKey?: string;
};

export class MemoryTokenStore implements TokenStore {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async getAccessToken() {
    return this.accessToken;
  }

  async getRefreshToken() {
    return this.refreshToken;
  }

  async setTokens(tokens: AuthTokens) {
    this.accessToken = tokens.accessToken;
    if (tokens.refreshToken) {
      this.refreshToken = tokens.refreshToken;
    }
  }

  async clear() {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

export class StorageTokenStore implements TokenStore {
  private readonly accessKey: string;
  private readonly refreshKey: string;

  constructor(
    private readonly storage: KeyValueStorageAdapter,
    options: StorageTokenStoreOptions = {},
  ) {
    this.accessKey = options.accessKey ?? 'access_token';
    this.refreshKey = options.refreshKey ?? 'refresh_token';
  }

  async getAccessToken() {
    return this.storage.getItem(this.accessKey);
  }

  async getRefreshToken() {
    return this.storage.getItem(this.refreshKey);
  }

  async setTokens(tokens: AuthTokens) {
    await this.storage.setItem(this.accessKey, tokens.accessToken);
    if (tokens.refreshToken) {
      await this.storage.setItem(this.refreshKey, tokens.refreshToken);
    }
  }

  async clear() {
    await this.storage.removeItem(this.accessKey);
    await this.storage.removeItem(this.refreshKey);
  }
}

export function createBrowserStorageTokenStore(options: StorageTokenStoreOptions = {}): TokenStore {
  const storageAdapter: KeyValueStorageAdapter = {
    getItem: (key) => (typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
    setItem: (key, value) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    },
    removeItem: (key) => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    },
  };

  return new StorageTokenStore(storageAdapter, options);
}
