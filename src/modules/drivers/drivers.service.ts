import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DriverStatus, Prisma, Role } from '@prisma/client';
import { AuditAction } from '../../audit/audit.actions';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OutboxService } from '../../outbox/outbox.service';
import { OutboxTopic } from '../../outbox/outbox.topics';
import type { SubmitDriverApplicationDto } from './dto/submit-driver-application.dto';

type UpsertDriverProfileInput = {
  fullName?: string;
  licenseNo?: string;
  passportNo?: string;
  docs?: unknown;
};

type Tx = Prisma.TransactionClient;

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  async getMe(userId: string) {
    return this.prisma.driverProfile.findUnique({ where: { userId } });
  }

  async upsert(userId: string, data: UpsertDriverProfileInput) {
    const docs = data.docs as Prisma.InputJsonValue | undefined;
    return this.prisma.driverProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: data.fullName ?? null,
        licenseNo: data.licenseNo ?? null,
        passportNo: data.passportNo ?? null,
        docs,
        status: DriverStatus.draft,
      },
      update: {
        fullName: data.fullName ?? undefined,
        licenseNo: data.licenseNo ?? undefined,
        passportNo: data.passportNo ?? undefined,
        docs,
      },
    });
  }

  async submit(userId: string, input: SubmitDriverApplicationDto) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Driver profile not found');

    if (!input?.docs?.licenseFrontUrl || !input?.docs?.passportFrontUrl) {
      throw new BadRequestException(
        'licenseFrontUrl and passportFrontUrl are required',
      );
    }

    if (profile.status === DriverStatus.verified) return profile;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.driverProfile.update({
        where: { userId },
        data: {
          status: DriverStatus.pending,
          rejectionReason: null,
          docs: input.docs as unknown as Prisma.InputJsonValue,
        },
      });

      await this.audit.logTx(tx, {
        action: AuditAction.DriverSubmit,
        entityType: 'driverProfile',
        entityId: userId,
        severity: 'info',
        metadata: {
          statusBefore: profile.status,
          statusAfter: updated.status,
          notes: input.notes ?? null,
        },
      });

      await this.outbox.enqueueTx(tx, {
        topic: OutboxTopic.DriverSubmitted,
        aggregateType: 'driverProfile',
        aggregateId: userId,
        idempotencyKey: `driverProfile:${userId}:submitted:${Date.now()}`,
        payload: {
          userId,
          statusBefore: profile.status,
          statusAfter: updated.status,
          notes: input.notes ?? null,
        },
      });

      return updated;
    });
  }

  async verifyTx(tx: Tx, userId: string) {
    const profile = await tx.driverProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Driver profile not found');

    if (profile.status === DriverStatus.verified) {
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

  async rejectTx(tx: Tx, userId: string, reason: string) {
    const profile = await tx.driverProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Driver profile not found');

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
