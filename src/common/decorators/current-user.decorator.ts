import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../types/auth-user';
import { hasKey, isRecord } from '../utils/type-guards';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user || !isRecord(user)) {
      throw new UnauthorizedException('User not found');
    }

    const sub =
      hasKey(user, 'sub') && typeof user.sub === 'string'
        ? user.sub
        : hasKey(user, 'id') && typeof user.id === 'string'
          ? user.id
          : undefined;

    if (!sub) {
      throw new UnauthorizedException('User subject not found');
    }

    return {
      sub,
      id:
        hasKey(user, 'id') && typeof user.id === 'string' ? user.id : undefined,
      phone:
        hasKey(user, 'phone') && typeof user.phone === 'string'
          ? user.phone
          : undefined,
      role:
        hasKey(user, 'role') && typeof user.role === 'string'
          ? (user.role as AuthUser['role'])
          : undefined,
      profile: hasKey(user, 'profile') ? user.profile : undefined,
      sid:
        hasKey(user, 'sid') && typeof user.sid === 'string'
          ? user.sid
          : undefined,
      impersonated:
        hasKey(user, 'impersonated') && typeof user.impersonated === 'boolean'
          ? user.impersonated
          : undefined,
      impersonatedBy:
        hasKey(user, 'impersonatedBy') &&
        typeof user.impersonatedBy === 'string'
          ? user.impersonatedBy
          : undefined,
      impersonationReason:
        hasKey(user, 'impersonationReason') &&
        typeof user.impersonationReason === 'string'
          ? user.impersonationReason
          : undefined,
    };
  },
);
