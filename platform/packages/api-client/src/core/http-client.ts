import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import type { paths } from '@platform/shared';
import { RefreshQueue } from './refresh-queue';
import type { AuthTokens, TokenStore } from './token-store';

type ApiPath = keyof paths & string;
type LowerMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';
type RequestConfigWithRetry = AxiosRequestConfig & {
  _retry?: boolean;
  _fallbackTried?: string[];
};

type Operation<P extends ApiPath, M extends LowerMethod> =
  M extends keyof paths[P] ? paths[P][M] : never;

type RequestBody<Op> = Op extends {
  requestBody: { content: { 'application/json': infer B } };
}
  ? B
  : never;

type ResponseJson<Op> = Op extends {
  responses: infer R;
}
  ? (
      '200' extends keyof R
        ? R['200'] extends { content: { 'application/json': infer B } }
          ? B
          : unknown
        : '201' extends keyof R
          ? R['201'] extends { content: { 'application/json': infer B } }
            ? B
            : unknown
          : unknown
    )
  : unknown;

export type ApiClientConfig = {
  baseURL: string;
  tokenStore: TokenStore;
  onUnauthorized?: () => Promise<void> | void;
  refreshPath?: string;
  withCredentials?: boolean;
  getCsrfToken?: () => Promise<string | null> | string | null;
  csrfHeaderName?: string;
};

function unwrapEnvelope(payload: unknown): unknown {
  let current = payload;
  for (let i = 0; i < 5; i += 1) {
    if (!current || typeof current !== 'object') break;
    if (!('data' in current)) break;
    const record = current as Record<string, unknown>;
    current = record.data;
  }
  return current;
}

function extractAuthTokens(payload: unknown): Partial<AuthTokens> {
  const data = unwrapEnvelope(payload);
  if (!data || typeof data !== 'object') {
    return {};
  }

  const record = data as Record<string, unknown>;
  const accessToken =
    typeof record.accessToken === 'string' && record.accessToken.trim().length > 0
      ? record.accessToken
      : undefined;
  const refreshToken =
    typeof record.refreshToken === 'string' && record.refreshToken.trim().length > 0
      ? record.refreshToken
      : undefined;

  return { accessToken, refreshToken };
}

function buildFallbackUrls(url: string): string[] {
  const out: string[] = [];

  if (url.startsWith('/api/v1/admin/')) {
    const rest = url.slice('/api/v1/admin/'.length);
    out.push(`/api/admin/${rest}`);
  } else if (url.startsWith('/api/admin/')) {
    const rest = url.slice('/api/admin/'.length);
    out.push(`/api/v1/admin/${rest}`);
  } else if (url.startsWith('/api/v1/')) {
    const rest = url.slice('/api/v1/'.length);
    out.push(`/api/${rest}`);
  } else if (url.startsWith('/api/')) {
    const rest = url.slice('/api/'.length);
    out.push(`/api/v1/${rest}`);
  }

  return out;
}

function isAdminApiPath(url: string): boolean {
  return url.startsWith('/api/admin/') || url.startsWith('/api/v1/admin/');
}

export class ApiClient {
  private readonly http: AxiosInstance;
  private readonly refreshQueue = new RefreshQueue();
  private readonly tokenStore: TokenStore;
  private readonly refreshPath: string;
  private readonly onUnauthorized?: () => Promise<void> | void;
  private readonly getCsrfToken?: () => Promise<string | null> | string | null;
  private readonly csrfHeaderName: string;
  private preferredAdminPrefix: '/api/v1/admin/' | '/api/admin/' | null = null;

  private rewriteAdminUrl(url: string): string {
    if (!this.preferredAdminPrefix) return url;
    if (this.preferredAdminPrefix === '/api/v1/admin/' && url.startsWith('/api/admin/')) {
      return `/api/v1/admin/${url.slice('/api/admin/'.length)}`;
    }
    if (this.preferredAdminPrefix === '/api/admin/' && url.startsWith('/api/v1/admin/')) {
      return `/api/admin/${url.slice('/api/v1/admin/'.length)}`;
    }
    return url;
  }

  private rememberAdminPrefix(url: string) {
    if (url.startsWith('/api/v1/admin/')) {
      this.preferredAdminPrefix = '/api/v1/admin/';
      return;
    }
    if (url.startsWith('/api/admin/')) {
      this.preferredAdminPrefix = '/api/admin/';
    }
  }

  constructor(config: ApiClientConfig) {
    this.tokenStore = config.tokenStore;
    this.refreshPath = config.refreshPath ?? '/api/auth/refresh';
    this.onUnauthorized = config.onUnauthorized;
    this.getCsrfToken = config.getCsrfToken;
    this.csrfHeaderName = config.csrfHeaderName ?? 'x-csrf-token';

    this.http = axios.create({
      baseURL: config.baseURL,
      timeout: 15_000,
      withCredentials: config.withCredentials ?? false,
    });

    this.http.interceptors.request.use(async (request) => {
      if (typeof request.url === 'string') {
        request.url = this.rewriteAdminUrl(request.url);
      }
      const token = await this.tokenStore.getAccessToken();
      if (token && token !== 'undefined' && token !== 'null') {
        request.headers.Authorization = `Bearer ${token}`;
      }
      return request;
    });

    this.http.interceptors.response.use(
      (response) => {
        const resolvedUrl =
          typeof response.config?.url === 'string' ? response.config.url : null;
        if (resolvedUrl && isAdminApiPath(resolvedUrl)) {
          this.rememberAdminPrefix(resolvedUrl);
        }
        return response;
      },
      async (error: AxiosError) => {
        const status = error.response?.status;
        const request = error.config as RequestConfigWithRetry;

        const method = String(request?.method ?? 'get').toLowerCase();
        const isSafeReadMethod = method === 'get' || method === 'head';
        const requestUrl =
          typeof request?.url === 'string' ? request.url : null;
        // Admin endpoints historically existed under both /api/admin/*
        // and /api/v1/admin/* in different deployments. If one returns 404,
        // retry the alternate path and remember it for subsequent calls.
        const canFallback =
          requestUrl !== null &&
          (isAdminApiPath(requestUrl) || isSafeReadMethod);
        if (status === 404 && requestUrl && canFallback) {
          const alreadyTried = new Set(request._fallbackTried ?? []);
          const fallbackUrl = buildFallbackUrls(requestUrl).find(
            (candidate) => !alreadyTried.has(candidate),
          );

          if (fallbackUrl) {
            request._fallbackTried = [...alreadyTried, fallbackUrl];
            request.url = fallbackUrl;
            if (isAdminApiPath(fallbackUrl)) {
              this.rememberAdminPrefix(fallbackUrl);
            }
            return this.http.request(request);
          }
        }

        if (status !== 401 || request._retry || request.url === this.refreshPath) {
          throw error;
        }

        request._retry = true;

        const refreshOutcome = await this.refreshQueue.run(async () => {
          const refreshToken = await this.tokenStore.getRefreshToken();
          const csrfToken = this.getCsrfToken
            ? await this.getCsrfToken()
            : null;
          const csrfHeaders = csrfToken
            ? { [this.csrfHeaderName]: csrfToken }
            : undefined;

          try {
            const response = await this.http.post(
              this.refreshPath,
              refreshToken ? { refreshToken } : undefined,
              { headers: csrfHeaders },
            );
            const tokenData = extractAuthTokens(response.data);
            if (!refreshToken) {
              // Cookie-based refresh flow (no JS-accessible refresh token).
              if (tokenData?.accessToken) {
                await this.tokenStore.setTokens({ accessToken: tokenData.accessToken });
                return tokenData.accessToken;
              }
              return 'cookie_refreshed';
            }
            if (!tokenData?.accessToken) return null;
            await this.tokenStore.setTokens(tokenData as AuthTokens);
            return tokenData.accessToken;
          } catch {
            await this.tokenStore.clear();
            return null;
          }
        });

        if (!refreshOutcome) {
          await this.onUnauthorized?.();
          throw error;
        }

        if (refreshOutcome !== 'cookie_refreshed') {
          request.headers = request.headers ?? {};
          request.headers.Authorization = `Bearer ${refreshOutcome}`;
        }
        return this.http.request(request);
      },
    );
  }

  request<P extends ApiPath, M extends LowerMethod>(
    method: M,
    path: P,
    config: Omit<AxiosRequestConfig, 'url' | 'method' | 'data'> & {
      body?: RequestBody<Operation<P, M>>;
    } = {},
  ): Promise<ResponseJson<Operation<P, M>>> {
    return this.http
      .request({
        ...config,
        method,
        url: path,
        data: config.body,
      })
      .then((response: AxiosResponse) => response.data as ResponseJson<Operation<P, M>>);
  }

  get client() {
    return this.http;
  }
}
