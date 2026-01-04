import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContextStore = {
  requestId?: string;
  ip?: string;
  userAgent?: string;
  actorId?: string;
  actorRole?: string;
};

export const requestContext = new AsyncLocalStorage<RequestContextStore>();

export function getRequestContext(): RequestContextStore {
  return requestContext.getStore() ?? {};
}
