import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<any>();
    const res = ctx.getResponse<any>();

    const requestId = req?.requestId;
    const timestamp = new Date().toISOString();

    // 1) HttpException (Nest)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse() as any;

      const message =
        typeof response === 'string'
          ? response
          : response?.message ?? exception.message;

      const details =
        typeof response === 'object' && response
          ? response
          : undefined;

      return res.status(status).json({
        ok: false,
        error: {
          code: `HTTP_${status}`,
          message: Array.isArray(message) ? message.join(', ') : String(message),
          details: sanitizeDetails(details),
        },
        meta: { requestId, timestamp },
      });
    }

    // 2) Prisma known errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = mapPrismaKnownError(exception);
      return res.status(mapped.status).json({
        ok: false,
        error: {
          code: mapped.code,
          message: mapped.message,
          details: mapped.details,
        },
        meta: { requestId, timestamp },
      });
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        ok: false,
        error: {
          code: 'PRISMA_VALIDATION',
          message: 'Invalid data for database operation',
        },
        meta: { requestId, timestamp },
      });
    }

    // 3) Unknown error
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : (exception as any)?.message ?? String(exception);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
      },
      meta: { requestId, timestamp },
    });
  }
}

function mapPrismaKnownError(e: Prisma.PrismaClientKnownRequestError): {
  status: number;
  code: string;
  message: string;
  details?: any;
} {
  // P2002 = Unique constraint
  if (e.code === 'P2002') {
    const target = (e.meta as any)?.target;
    return {
      status: HttpStatus.CONFLICT,
      code: 'UNIQUE_CONSTRAINT',
      message: 'Unique constraint violated',
      details: target ? { target } : undefined,
    };
  }

  // P2025 = Record not found
  if (e.code === 'P2025') {
    return {
      status: HttpStatus.NOT_FOUND,
      code: 'NOT_FOUND',
      message: 'Record not found',
    };
  }

  return {
    status: HttpStatus.BAD_REQUEST,
    code: `PRISMA_${e.code}`,
    message: 'Database request error',
    details: process.env.NODE_ENV === 'production' ? undefined : { meta: e.meta },
  };
}

function sanitizeDetails(details: any) {
  if (!details || typeof details !== 'object') return details;

  // вычищаем чувствительные поля если вдруг пролезли
  const copy = JSON.parse(JSON.stringify(details));
  deepDelete(copy, 'password');
  deepDelete(copy, 'passwordHash');
  deepDelete(copy, 'refreshToken');
  return copy;
}

function deepDelete(obj: any, key: string) {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    if (k === key) delete obj[k];
    else deepDelete(obj[k], key);
  }
}
