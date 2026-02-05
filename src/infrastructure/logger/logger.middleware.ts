import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLoggerService } from './logger.service';
import { getRequestContext } from '../request-context/request-context';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(
    req: Request & { requestId?: string },
    res: Response,
    next: NextFunction,
  ) {
    const startedAt = Date.now();

    res.on('finish', () => {
      const ms = Date.now() - startedAt;
      const ctx = getRequestContext();
      const userId = ctx.actorId;

      this.logger.info('HTTP', {
        requestId: ctx.requestId ?? req.requestId,
        userId,
        userRole: ctx.actorRole,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: ms,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    });

    next();
  }
}
