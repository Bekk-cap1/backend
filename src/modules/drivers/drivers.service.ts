import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { DriverStatus, Role, Prisma } from '@prisma/client';

type UpsertDriverProfileInput = {
  fullName?: string;
  licenseNo?: string;
  passportNo?: string;
  docs?: Prisma.InputJsonValue;
};

type Tx = Prisma.TransactionClient;

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    return this.prisma.driverProfile.findUnique({ where: { userId } });
  }

  async upsert(userId: string, data: UpsertDriverProfileInput) {
    return this.prisma.driverProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: data.fullName ?? null,
        licenseNo: data.licenseNo ?? null,
        passportNo: data.passportNo ?? null,
        docs: data.docs ?? undefined,
        status: DriverStatus.draft,
      },
      update: {
        fullName: data.fullName ?? undefined,
        licenseNo: data.licenseNo ?? undefined,
        passportNo: data.passportNo ?? undefined,
        docs: data.docs ?? undefined,
      },
    });
  }

  async submit(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Driver profile not found');

    // Политика: verified не трогаем
    if (profile.status === DriverStatus.verified) return profile;

    return this.prisma.driverProfile.update({
      where: { userId },
      data: {
        status: DriverStatus.pending,
        rejectionReason: null,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // NEW: tx-safe methods for AdminService outbox/audit composition
  // ---------------------------------------------------------------------------

  /**
   * TX-safe verify:
   * - driverProfile.status = verified
   * - verifiedAt set
   * - rejectionReason cleared
   * - user.role = driver
   *
   * Idempotent: if already verified, just ensure role=driver.
   */
  async verifyTx(tx: Tx, userId: string) {
    const profile = await tx.driverProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Driver profile not found');

    if (profile.status === DriverStatus.verified) {
      // Ensure role is correct (idempotency guarantee)
      await tx.user.update({
        where: { id: userId },
        data: { role: Role.driver },
      });
      return profile;
    }

    const updated = await tx.driverProfile.update({
      where: { userId },
      data: {
        status: DriverStatus.verified,
        verifiedAt: new Date(),
        rejectionReason: null,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { role: Role.driver },
    });

    return updated;
  }

  /**
   * TX-safe reject:
   * - driverProfile.status = rejected
   * - rejectionReason set
   * - verifiedAt cleared
   *
   * Idempotent: if already rejected, updates rejectionReason (keeps status).
   * Role is NOT changed (your policy).
   */
  async rejectTx(tx: Tx, userId: string, reason: string) {
    const profile = await tx.driverProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Driver profile not found');

    // if already rejected, allow updating reason (useful for admin corrections)
    if (profile.status === DriverStatus.rejected) {
      return tx.driverProfile.update({
        where: { userId },
        data: {
          rejectionReason: reason,
        },
      });
    }

    const updated = await tx.driverProfile.update({
      where: { userId },
      data: {
        status: DriverStatus.rejected,
        rejectionReason: reason,
        verifiedAt: null,
      },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Existing admin actions: keep them as wrappers (so old calls still work)
  // ---------------------------------------------------------------------------

  async verify(userId: string) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => this.verifyTx(tx, userId),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async reject(userId: string, reason: string) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => this.rejectTx(tx, userId, reason),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async assertVerifiedDriver(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { status: true, verifiedAt: true },
    });

    if (!profile || profile.status !== DriverStatus.verified) {
      throw new ForbiddenException('Driver is not verified');
    }
    return profile;
  }
}
