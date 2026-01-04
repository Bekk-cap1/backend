import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { AppLoggerService } from "./logger.service";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startedAt = Date.now();

    res.on("finish", () => {
      const ms = Date.now() - startedAt;

      this.logger.log("HTTP", {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: ms,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
    });

    next();
  }
}
