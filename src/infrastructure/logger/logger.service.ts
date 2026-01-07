import { Injectable, LoggerService } from '@nestjs/common';
import pino, { Logger } from 'pino';

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';
    const level = process.env.LOG_LEVEL ?? 'info';

    this.logger = pino({
      level,
      transport: isProd
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true,
              translateTime: 'SYS:standard',
            },
          },
      redact: {
        paths: [
          'req.headers.authorization',
          '*.password',
          '*.passwordHash',
          '*.refreshToken',
        ],
        remove: true,
      },
    });
  }

  // Nest LoggerService API
  log(message: any, ...optionalParams: any[]) {
    this.logger.info({ optionalParams }, message);
  }
  error(message: any, ...optionalParams: any[]) {
    this.logger.error({ optionalParams }, message);
  }
  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn({ optionalParams }, message);
  }
  debug(message: any, ...optionalParams: any[]) {
    this.logger.debug({ optionalParams }, message);
  }
  verbose(message: any, ...optionalParams: any[]) {
    this.logger.trace({ optionalParams }, message);
  }

  child(bindings: Record<string, any>) {
    return this.logger.child(bindings);
  }
  info(message: any, meta?: Record<string, any>) {
    if (meta) this.logger.info(meta, message);
    else this.logger.info(message);
  }
  warnWithMeta(message: any, meta?: Record<string, any>) {
    if (meta) this.logger.warn(meta, message);
    else this.logger.warn(message);
  }

  errorWithMeta(message: any, meta?: Record<string, any>) {
    if (meta) this.logger.error(meta, message);
    else this.logger.error(message);
  }
}
