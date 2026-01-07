import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DriverStatus, Role } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { hasKey, isRecord } from '../utils/type-guards';

@Injectable()
export class DriverVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<unknown>();
    const user =
      hasKey(req, 'user') && isRecord(req.user) ? req.user : undefined;
    const userId =
      typeof user?.sub === 'string'
        ? user.sub
        : typeof user?.id === 'string'
          ? user.id
          : undefined;

    if (!userId) throw new ForbiddenException('Unauthorized');

    const role = typeof user?.role === 'string' ? user.role : undefined;
    if (role !== Role.driver) {
      throw new ForbiddenException('Driver role required');
    }

    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { status: true },
    });

    if (!profile || profile.status !== DriverStatus.verified) {
      throw new ForbiddenException('Driver is not verified');
    }

    return true;
  }
}
