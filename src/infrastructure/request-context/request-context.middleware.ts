import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { requestContext } from './request-context';

function pickClientIp(req: any): string | undefined {
  // If behind proxy/load balancer, prefer X-Forwarded-For
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.ip;
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request & { user?: any }, _res: Response, next: NextFunction) {
    const requestId =
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID();

    const ip = pickClientIp(req);
    const userAgent =
      (req.headers['user-agent'] as string | undefined) ?? undefined;

    // JwtAuthGuard typically attaches req.user; for Public endpoints it's absent
    const actorId = req.user?.sub ?? req.user?.id;
    const actorRole = req.user?.role;

    requestContext.run(
      { requestId, ip, userAgent, actorId, actorRole },
      () => next(),
    );
  }
}
