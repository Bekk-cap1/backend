import { getRequestContext } from './infrastructure/request-context/request-context';

const ctx = getRequestContext();
console.log(ctx.requestId, ctx.ip, ctx.userAgent, ctx.actorId, ctx.actorRole);
