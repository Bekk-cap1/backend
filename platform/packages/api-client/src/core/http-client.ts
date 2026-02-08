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

export class ApiClient {
  private readonly http: AxiosInstance;
  private readonly refreshQueue = new RefreshQueue();
  private readonly tokenStore: TokenStore;
  private readonly refreshPath: string;
  private readonly onUnauthorized?: () => Promise<void> | void;
  private readonly getCsrfToken?: () => Promise<string | null> | string | null;
  private readonly csrfHeaderName: string;

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
      const token = await this.tokenStore.getAccessToken();
      if (token) {
        request.headers.Authorization = `Bearer ${token}`;
      }
      return request;
    });

    this.http.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const status = error.response?.status;
        const request = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

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
            const response = await this.http.post<{ data?: AuthTokens }>(
              this.refreshPath,
              refreshToken ? { refreshToken } : undefined,
              { headers: csrfHeaders },
            );

            const tokenData = response.data?.data;
            if (!refreshToken) {
              // Cookie-based refresh flow (no JS-accessible refresh token).
              if (tokenData?.accessToken) {
                await this.tokenStore.setTokens({ accessToken: tokenData.accessToken });
                return tokenData.accessToken;
              }
              return 'cookie_refreshed';
            }
            if (!tokenData?.accessToken) return null;
            await this.tokenStore.setTokens(tokenData);
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
