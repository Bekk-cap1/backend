import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { DriverStatus } from '@prisma/client';

@Injectable()
export class DriverVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user?.id) throw new ForbiddenException('Unauthorized');

    // Variant B: не просто role=driver, а driverProfile.status=verified
    if (user.role !== 'driver') {
      throw new ForbiddenException('Driver role required');
    }

    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });

    if (!profile || profile.status !== DriverStatus.verified) {
      throw new ForbiddenException('Driver is not verified');
    }

    return true;
  }
}
