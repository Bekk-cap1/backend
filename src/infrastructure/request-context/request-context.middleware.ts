import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../../common/types/auth-user';
import { requestContext } from './request-context';

function pickClientIp(req: Request): string | undefined {
  // If behind proxy/load balancer, prefer X-Forwarded-For
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0]?.trim();
  }
  return req.ip;
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request & { user?: AuthUser }, _res: Response, next: NextFunction) {
    const headerId = req.headers['x-request-id'];
    const requestId =
      typeof headerId === 'string'
        ? headerId
        : Array.isArray(headerId) && headerId.length > 0
          ? headerId[0]
          : randomUUID();

    const ip = pickClientIp(req);
    const userAgentHeader = req.headers['user-agent'] as
      | string
      | string[]
      | undefined;
    const userAgent = Array.isArray(userAgentHeader)
      ? userAgentHeader[0]
      : userAgentHeader;

    // JwtAuthGuard typically attaches req.user; for Public endpoints it's absent
    const actorId = req.user?.sub ?? req.user?.id;
    const actorRole =
      typeof req.user?.role === 'string' ? req.user.role : undefined;

    requestContext.run({ requestId, ip, userAgent, actorId, actorRole }, () =>
      next(),
    );
  }
}
