import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (!this.metrics.isEnabled()) {
      next();
      return;
    }

    const start = process.hrtime.bigint();

    res.on('finish', () => {
      if (req.path === '/metrics') return;

      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const routePath = req.route?.path;
      const base = req.baseUrl ?? '';
      const route = routePath ? `${base}${routePath}` : req.path;

      this.metrics.observeHttp(
        {
          method: req.method,
          route,
          status: String(res.statusCode),
        },
        durationMs,
      );
    });

    next();
  }
}
