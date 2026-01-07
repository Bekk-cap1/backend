import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<{
    ok: true;
    data: unknown;
    meta: { requestId?: string; timestamp: string };
  }> {
    const req = context.switchToHttp().getRequest<Request>();
    const requestId = req?.requestId;

    return next.handle().pipe(
      map((data) => ({
        ok: true,
        data,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
