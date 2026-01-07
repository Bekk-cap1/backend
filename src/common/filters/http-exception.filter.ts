import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { isRecord } from '../utils/type-guards';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const requestId = req?.requestId;
    const timestamp = new Date().toISOString();

    // 1) HttpException (Nest)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message = getExceptionMessage(response, exception.message);
      const details = isRecord(response) ? response : undefined;

      return res.status(status).json({
        ok: false,
        error: {
          code: `HTTP_${status}`,
          message,
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
        : exception instanceof Error
          ? exception.message
          : String(exception);

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
  details?: Record<string, unknown>;
} {
  // P2002 = Unique constraint
  if (e.code === 'P2002') {
    const target = isRecord(e.meta) ? e.meta.target : undefined;
    return {
      status: HttpStatus.CONFLICT,
      code: 'UNIQUE_CONSTRAINT',
      message: 'Unique constraint violated',
      details: target === undefined ? undefined : { target },
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
    details:
      process.env.NODE_ENV === 'production' ? undefined : { meta: e.meta },
  };
}

function getExceptionMessage(response: unknown, fallback: string) {
  if (typeof response === 'string') {
    return response;
  }

  if (isRecord(response) && 'message' in response) {
    const msg = response.message;
    if (Array.isArray(msg)) {
      return msg.map((item) => String(item)).join(', ');
    }
    if (typeof msg === 'string') {
      return msg;
    }
    return String(msg);
  }

  return fallback;
}

function sanitizeDetails(details: unknown) {
  if (!isRecord(details)) return details;

  // Remove sensitive fields from error details.
  const copy = JSON.parse(JSON.stringify(details)) as Record<string, unknown>;
  deepDelete(copy, 'password');
  deepDelete(copy, 'passwordHash');
  deepDelete(copy, 'refreshToken');
  return copy;
}

function deepDelete(value: unknown, key: string) {
  if (Array.isArray(value)) {
    for (const item of value) {
      deepDelete(item, key);
    }
    return;
  }

  if (!isRecord(value)) return;

  for (const [k, v] of Object.entries(value)) {
    if (k === key) {
      delete value[k];
    } else {
      deepDelete(v, key);
    }
  }
}
