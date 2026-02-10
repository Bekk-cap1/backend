import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { DriversService } from '../drivers/drivers.service';
import { AdminDriversQueryDto } from './dto/admin-drivers-query.dto';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import {
  PaymentStatus,
  PaymentProvider,
  OtpPurpose,
  OutboxStatus,
  Role,
  SupportTicketStatus,
  DriverStatus,
  TripStatus,
  RequestStatus,
  OfferStatus,
  BookingStatus,
  PoiType,
  Prisma,
} from '@prisma/client';

import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit.actions';

import { OutboxService } from '../../outbox/outbox.service';
import { OutboxTopic } from '../../outbox/outbox.topics';
import {
  isSuperAdminRole,
  isSuperAdminImmutable,
  isSuperAdminPhone,
} from '../../common/auth/super-admin.util';
import { AuthStrategiesService } from '../auth/strategies/auth.service';
import { PaymentsService } from '../payments/payments.service';

type RadarPoiRow = {
  id: string;
  name: string;
  type: PoiType;
  description: string | null;
  radiusMeters: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lat: number;
  lon: number;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drivers: DriversService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly authStrategies: AuthStrategiesService,
    private readonly payments: PaymentsService,
  ) {}

  private assertSuperAdminNotBannedOrDemoted(params: {
    role?: Role;
    phone: string;
    nextRole?: Role;
    action: 'ban' | 'role-change';
  }) {
    const isSuperadmin =
      isSuperAdminRole(params.role) || isSuperAdminPhone(params.phone);
    if (!isSuperadmin) return;
    if (!isSuperAdminImmutable()) return;

    if (params.action === 'ban') {
      throw new ForbiddenException('Superadmin cannot be banned');
    }

    if (params.nextRole && params.nextRole !== Role.superadmin) {
      throw new ForbiddenException('Superadmin role cannot be changed');
    }
  }

  private isSeatHoldingBookingStatus(status: BookingStatus): boolean {
    return status === BookingStatus.confirmed || status === BookingStatus.paid;
  }

  private isAdminAssignableRole(role: Role): boolean {
    return (
      role === Role.admin ||
      role === Role.superadmin ||
      role === Role.moderator ||
      role === Role.support
    );
  }

  private hasRequiredDriverDocs(input: unknown): boolean {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return false;
    }
    const docs = input as Record<string, unknown>;
    return (
      typeof docs.licenseFrontUrl === 'string' &&
      docs.licenseFrontUrl.trim().length > 0 &&
      typeof docs.passportFrontUrl === 'string' &&
      docs.passportFrontUrl.trim().length > 0
    );
  }

  async listDrivers(q: AdminDriversQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const where: Prisma.DriverProfileWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.userId ? { userId: q.userId } : {}),
      ...(q.q
        ? {
            OR: [
              {
                user: {
                  phone: { contains: q.q, mode: Prisma.QueryMode.insensitive },
                },
              },
              {
                fullName: {
                  contains: q.q,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.driverProfile.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              role: true,
              profile: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.driverProfile.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getDriverApplicationByUserId(userId: string) {
    const item = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            role: true,
            profile: true,
            createdAt: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Driver application not found');
    }

    return item;
  }

  async listAudit(q: AdminAuditQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;

    const where: Prisma.AuditLogWhereInput = {
      ...(q.actorId ? { actorId: q.actorId } : {}),
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
      ...(q.targetId ? { entityId: q.targetId } : {}),
      ...(q.action ? { action: q.action } : {}),
      ...(q.severity ? { severity: q.severity } : {}),
      ...(q.from || q.to
        ? {
            createdAt: {
              ...(q.from ? { gte: new Date(q.from) } : {}),
              ...(q.to ? { lte: new Date(q.to) } : {}),
            },
          }
        : {}),
      ...(q.impersonated !== undefined
        ? q.impersonated
          ? {
              metadata: {
                path: ['_context', 'impersonated'],
                equals: true,
              },
            }
          : {
              NOT: {
                metadata: {
                  path: ['_context', 'impersonated'],
                  equals: true,
                },
              },
            }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Верификация водителя (production-grade):
   * - всё в одной транзакции: driverProfile + role + audit + outbox
   * - идемпотентно (DriversService.verifyTx)
   */
  async verifyDriver(userId: string, reason?: string) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // pre-state
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, phone: true },
        });
        if (!user) throw new NotFoundException('User not found');

        const profileBefore = await tx.driverProfile.findUnique({
          where: { userId },
          select: { status: true, rejectionReason: true, verifiedAt: true },
        });
        if (!profileBefore)
          throw new NotFoundException('Driver profile not found');

        // domain update (tx-safe)
        const profileAfter = await this.drivers.verifyTx(tx, userId);

        // audit
        await this.audit.logTx(tx, {
          action: AuditAction.DriverVerify,
          entityType: 'driverProfile',
          entityId: userId,
          severity: 'critical',
          metadata: {
            userId,
            userPhone: user.phone,
            userRoleBefore: user.role,
            userRoleAfter: Role.driver,
            driverStatusBefore: profileBefore.status,
            driverStatusAfter: profileAfter.status,
            reason: reason ?? null,
          },
        });

        // outbox (idempotencyKey стабильный)
        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.DriverVerified,
          aggregateType: 'driverProfile',
          aggregateId: userId,
          idempotencyKey: `driverProfile:${userId}:verified`,
          payload: {
            userId,
            driverStatusBefore: profileBefore.status,
            driverStatusAfter: profileAfter.status,
            verifiedAt: profileAfter.verifiedAt,
            reason: reason ?? null,
          },
        });

        return { ok: true, profile: profileAfter };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Отклонение водителя (production-grade):
   * - всё в одной транзакции: driverProfile + audit + outbox
   * - роль user НЕ меняем (ваша политика)
   * - идемпотентно (DriversService.rejectTx)
   */
  async rejectDriver(userId: string, reason?: string) {
    const finalReason = reason ?? 'Rejected by admin';

    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // pre-state
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, phone: true },
        });
        if (!user) throw new NotFoundException('User not found');

        const profileBefore = await tx.driverProfile.findUnique({
          where: { userId },
          select: { status: true, rejectionReason: true, verifiedAt: true },
        });
        if (!profileBefore)
          throw new NotFoundException('Driver profile not found');

        // domain update (tx-safe)
        const profileAfter = await this.drivers.rejectTx(
          tx,
          userId,
          finalReason,
        );

        // audit
        await this.audit.logTx(tx, {
          action: AuditAction.DriverReject,
          entityType: 'driverProfile',
          entityId: userId,
          severity: 'warning',
          metadata: {
            userId,
            userPhone: user.phone,
            userRole: user.role,
            driverStatusBefore: profileBefore.status,
            driverStatusAfter: profileAfter.status,
            reason: finalReason,
          },
        });

        // outbox
        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.DriverRejected,
          aggregateType: 'driverProfile',
          aggregateId: userId,
          idempotencyKey: `driverProfile:${userId}:rejected:${Buffer.from(finalReason).toString('base64').slice(0, 32)}`,
          payload: {
            userId,
            reason: finalReason,
            driverStatusBefore: profileBefore.status,
            driverStatusAfter: profileAfter.status,
          },
        });

        return { ok: true, profile: profileAfter };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Смена роли (production-grade):
   * - tx-safe: update user + audit + outbox
   */
  async updateUserRole(userId: string, role: Role) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const before = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, phone: true, role: true },
        });
        if (!before) throw new NotFoundException('User not found');
        this.assertSuperAdminNotBannedOrDemoted({
          role: before.role,
          phone: before.phone,
          nextRole: role,
          action: 'role-change',
        });

        if (role === Role.driver) {
          const driverProfile = await tx.driverProfile.findUnique({
            where: { userId },
            select: { status: true, docs: true },
          });
          if (!driverProfile) {
            throw new BadRequestException(
              'Cannot assign driver role: driver profile is missing',
            );
          }
          if (driverProfile.status !== DriverStatus.verified) {
            throw new BadRequestException(
              'Cannot assign driver role: driver profile must be verified first',
            );
          }
          if (!this.hasRequiredDriverDocs(driverProfile.docs)) {
            throw new BadRequestException(
              'Cannot assign driver role: required driver documents are missing',
            );
          }
        }

        const updated = await tx.user.update({
          where: { id: userId },
          data: { role },
          select: { id: true, phone: true, role: true, updatedAt: true },
        });

        await this.audit.logTx(tx, {
          action: AuditAction.UserRoleChange,
          entityType: 'user',
          entityId: userId,
          severity: 'critical',
          metadata: {
            userId,
            userPhone: before.phone,
            fromRole: before.role,
            toRole: updated.role,
          },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.UserRoleChanged,
          aggregateType: 'user',
          aggregateId: userId,
          idempotencyKey: `user:${userId}:role:${before.role}->${updated.role}`,
          payload: {
            userId,
            fromRole: before.role,
            toRole: updated.role,
          },
        });

        return { ok: true, user: updated };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listUsers(params: {
    role?: Role;
    isBanned?: boolean;
    verified?: boolean;
    createdFrom?: string;
    createdTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: Prisma.UserWhereInput = {
      ...(params.role ? { role: params.role } : {}),
      ...(params.isBanned !== undefined ? { isBanned: params.isBanned } : {}),
      ...(params.verified !== undefined
        ? params.verified
          ? { driverProfile: { is: { status: DriverStatus.verified } } }
          : {
              OR: [
                { driverProfile: { is: null } },
                { driverProfile: { isNot: { status: DriverStatus.verified } } },
              ],
            }
        : {}),
      ...(params.createdFrom || params.createdTo
        ? {
            createdAt: {
              ...(params.createdFrom
                ? { gte: new Date(params.createdFrom) }
                : {}),
              ...(params.createdTo ? { lte: new Date(params.createdTo) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          phone: true,
          role: true,
          isBanned: true,
          bannedAt: true,
          banReason: true,
          createdAt: true,
          profile: {
            select: {
              fullName: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async banUser(userId: string, reason?: string) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        this.assertSuperAdminNotBannedOrDemoted({
          role: user.role,
          phone: user.phone,
          action: 'ban',
        });

        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            isBanned: true,
            bannedAt: new Date(),
            banReason: reason ?? null,
          },
          select: {
            id: true,
            phone: true,
            role: true,
            isBanned: true,
            bannedAt: true,
            banReason: true,
          },
        });

        await this.audit.logTx(tx, {
          action: AuditAction.UserBan,
          entityType: 'user',
          entityId: userId,
          severity: 'critical',
          metadata: { userId, reason: reason ?? null },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.UserBanned,
          aggregateType: 'user',
          aggregateId: userId,
          idempotencyKey: `user:${userId}:banned`,
          payload: { userId, reason: reason ?? null },
        });

        return { ok: true, user: updated };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async unbanUser(userId: string) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            isBanned: false,
            bannedAt: null,
            banReason: null,
          },
          select: {
            id: true,
            phone: true,
            role: true,
            isBanned: true,
            bannedAt: true,
            banReason: true,
          },
        });

        await this.audit.logTx(tx, {
          action: AuditAction.UserUnban,
          entityType: 'user',
          entityId: userId,
          severity: 'warning',
          metadata: { userId },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.UserUnbanned,
          aggregateType: 'user',
          aggregateId: userId,
          idempotencyKey: `user:${userId}:unbanned`,
          payload: { userId },
        });

        return { ok: true, user: updated };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listPayments(params: {
    status?: PaymentStatus;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: Prisma.PaymentWhereInput = {
      ...(params.status ? { status: params.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          booking: {
            select: {
              id: true,
              passengerId: true,
              tripId: true,
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getPaymentsReconciliation(params: {
    from?: string;
    to?: string;
    staleMinutes?: number;
  }) {
    const fromDate = params.from ? new Date(params.from) : undefined;
    const toDate = params.to ? new Date(params.to) : undefined;
    const staleMinutes =
      params.staleMinutes ??
      Number(process.env.PAYMENT_RECONCILE_STALE_MINUTES ?? 60);
    const staleCutoff = new Date(Date.now() - staleMinutes * 60_000);

    const where: Prisma.PaymentWhereInput = {
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const [payments, stalePending, paidWithoutPaidAt] =
      await this.prisma.$transaction([
        this.prisma.payment.findMany({
          where,
          select: { status: true, amount: true },
        }),
        this.prisma.payment.count({
          where: {
            ...where,
            status: { in: [PaymentStatus.created, PaymentStatus.pending] },
            createdAt: { lt: staleCutoff },
          },
        }),
        this.prisma.payment.count({
          where: {
            ...where,
            status: PaymentStatus.paid,
            paidAt: null,
          },
        }),
      ]);

    const grouped = new Map<PaymentStatus, { count: number; amount: number }>();
    for (const payment of payments) {
      const current = grouped.get(payment.status) ?? { count: 0, amount: 0 };
      current.count += 1;
      current.amount += Number(payment.amount);
      grouped.set(payment.status, current);
    }
    const byStatus = Array.from(grouped.entries()).map(([status, values]) => ({
      status,
      count: values.count,
      amount: values.amount,
    }));

    const totalCount = byStatus.reduce((acc, row) => acc + row.count, 0);
    const totalAmount = byStatus.reduce((acc, row) => acc + row.amount, 0);

    return {
      window: {
        from: fromDate?.toISOString() ?? null,
        to: toDate?.toISOString() ?? null,
      },
      staleThresholdMinutes: staleMinutes,
      totals: {
        count: totalCount,
        amount: totalAmount,
      },
      byStatus,
      mismatches: {
        stalePending,
        paidWithoutPaidAt,
        total: stalePending + paidWithoutPaidAt,
      },
    };
  }

  async listSupportTickets(params: {
    status?: SupportTicketStatus;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: Prisma.SupportTicketWhereInput = {
      ...(params.status ? { status: params.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, phone: true, role: true } },
          booking: { select: { id: true, tripId: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateSupportTicketStatus(
    ticketId: string,
    status: SupportTicketStatus,
  ) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const exists = await tx.supportTicket.findUnique({
        where: { id: ticketId },
        select: { id: true, status: true, userId: true },
      });
      if (!exists) throw new NotFoundException('Support ticket not found');

      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: { status },
      });

      await this.audit.logTx(tx, {
        action: AuditAction.TicketStatusChange,
        entityType: 'supportTicket',
        entityId: ticketId,
        severity: 'warning',
        metadata: {
          ticketId,
          userId: exists.userId,
          fromStatus: exists.status,
          toStatus: status,
        },
      });

      return updated;
    });
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        driverProfile: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(input: {
    phone: string;
    password: string;
    role?: Role;
    reason: string;
  }) {
    const normalizedPhone = input.phone.replace(/\s+/g, '');
    const passwordHash = await bcrypt.hash(input.password, 10);

    const created = await this.prisma.user.create({
      data: {
        phone: normalizedPhone,
        passwordHash,
        role: input.role ?? Role.passenger,
      },
      select: {
        id: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    await this.audit.log({
      action: AuditAction.UserCreate,
      entityType: 'user',
      entityId: created.id,
      severity: 'critical',
      metadata: {
        reason: input.reason,
        after: created,
      },
    });

    return created;
  }

  async updateUser(
    userId: string,
    input: {
      phone?: string;
      role?: Role;
      reason: string;
    },
  ) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const before = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            phone: true,
            role: true,
            isBanned: true,
            bannedAt: true,
            banReason: true,
          },
        });
        if (!before) throw new NotFoundException('User not found');

        if (input.role) {
          this.assertSuperAdminNotBannedOrDemoted({
            role: before.role,
            phone: before.phone,
            nextRole: input.role,
            action: 'role-change',
          });
        }

        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            ...(input.phone ? { phone: input.phone.replace(/\s+/g, '') } : {}),
            ...(input.role ? { role: input.role } : {}),
          },
          select: {
            id: true,
            phone: true,
            role: true,
            isBanned: true,
            bannedAt: true,
            banReason: true,
          },
        });

        await this.audit.logTx(tx, {
          action: AuditAction.UserUpdate,
          entityType: 'user',
          entityId: userId,
          severity: 'critical',
          metadata: {
            reason: input.reason,
            before,
            after: updated,
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async deleteUser(userId: string, reason: string) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const before = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            phone: true,
            role: true,
            isBanned: true,
          },
        });
        if (!before) throw new NotFoundException('User not found');

        this.assertSuperAdminNotBannedOrDemoted({
          role: before.role,
          phone: before.phone,
          action: 'ban',
        });

        await tx.user.delete({ where: { id: userId } });

        await this.audit.logTx(tx, {
          action: AuditAction.UserDelete,
          entityType: 'user',
          entityId: userId,
          severity: 'critical',
          metadata: {
            reason,
            before,
            after: null,
          },
        });

        return { ok: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async resetUserPassword(params: {
    userId: string;
    reason: string;
    newPassword?: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, phone: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const generatedPassword =
      params.newPassword ?? randomBytes(6).toString('base64url');
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: { id: params.userId },
        data: { passwordHash },
      });

      await tx.userSession.updateMany({
        where: { userId: params.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.audit.logTx(tx, {
        action: AuditAction.UserResetPassword,
        entityType: 'user',
        entityId: params.userId,
        severity: 'critical',
        metadata: {
          reason: params.reason,
          userId: params.userId,
          targetRole: user.role,
        },
      });
    });

    return {
      ok: true,
      temporaryPassword: generatedPassword,
    };
  }

  async logoutAllSessions(params: { userId: string; reason: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.authStrategies.revokeAll(params.userId);

    await this.audit.log({
      action: AuditAction.UserLogoutAll,
      entityType: 'user',
      entityId: params.userId,
      severity: 'critical',
      metadata: {
        reason: params.reason,
      },
    });

    return { ok: true };
  }

  async impersonate(params: {
    actorUserId: string;
    targetUserId: string;
    reason: string;
  }) {
    const [actor, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: params.actorUserId },
        select: { id: true, role: true },
      }),
      this.prisma.user.findUnique({
        where: { id: params.targetUserId },
        select: { id: true, phone: true, role: true },
      }),
    ]);

    if (!actor) throw new NotFoundException('Actor not found');
    if (!target) throw new NotFoundException('Target user not found');

    if (!isSuperAdminRole(actor.role)) {
      throw new ForbiddenException('Only superadmin can impersonate');
    }
    if (isSuperAdminRole(target.role)) {
      throw new ForbiddenException('Cannot impersonate superadmin');
    }

    const token = this.authStrategies.issueImpersonationAccessToken({
      actorUserId: actor.id,
      targetUserId: target.id,
      phone: target.phone,
      role: target.role,
      reason: params.reason,
    });

    await this.audit.log({
      action: AuditAction.ImpersonationStart,
      entityType: 'user',
      entityId: target.id,
      severity: 'critical',
      metadata: {
        reason: params.reason,
        targetId: target.id,
        targetRole: target.role,
      },
    });

    return token;
  }

  async stopImpersonation(params: { reason: string }) {
    await this.audit.log({
      action: AuditAction.ImpersonationStop,
      entityType: 'session',
      severity: 'warning',
      metadata: {
        reason: params.reason,
      },
    });
    return { ok: true };
  }

  async markPaymentPaid(params: {
    paymentId: string;
    reason: string;
    idempotencyKey?: string;
  }) {
    const result = await this.payments.markPaid(
      params.paymentId,
      params.reason,
      params.idempotencyKey,
    );

    await this.audit.log({
      action: AuditAction.PaymentMarkPaid,
      entityType: 'payment',
      entityId: params.paymentId,
      severity: 'critical',
      metadata: {
        reason: params.reason,
        idempotencyKey: params.idempotencyKey ?? null,
      },
    });

    return result;
  }

  async listTrips(params: {
    status?: TripStatus;
    fromCityId?: string;
    toCityId?: string;
    driverId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: Prisma.TripWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.fromCityId ? { fromCityId: params.fromCityId } : {}),
      ...(params.toCityId ? { toCityId: params.toCityId } : {}),
      ...(params.driverId ? { driverId: params.driverId } : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            departureAt: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        include: {
          fromCity: true,
          toCity: true,
          driver: { select: { id: true, phone: true, role: true } },
          vehicle: true,
        },
        orderBy: { departureAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.trip.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getTripByIdAdmin(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        fromCity: true,
        toCity: true,
        driver: {
          select: { id: true, phone: true, role: true, profile: true },
        },
        vehicle: true,
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async forceUpdateTrip(
    tripId: string,
    input: {
      reason: string;
      price?: number;
      seatsTotal?: number;
      departureAt?: string;
      fromCityId?: string;
      toCityId?: string;
      vehicleId?: string | null;
    },
  ) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const before = await tx.trip.findUnique({
          where: { id: tripId },
          include: {
            bookings: {
              where: {
                status: { in: [BookingStatus.confirmed, BookingStatus.paid] },
              },
              select: { seats: true },
            },
          },
        });
        if (!before) throw new NotFoundException('Trip not found');

        const bookedSeats = before.bookings.reduce(
          (acc, b) => acc + b.seats,
          0,
        );
        const data: Prisma.TripUpdateInput = {};

        if (input.price !== undefined) data.price = input.price;
        if (input.fromCityId)
          data.fromCity = { connect: { id: input.fromCityId } };
        if (input.toCityId) data.toCity = { connect: { id: input.toCityId } };
        if (input.vehicleId !== undefined) {
          data.vehicle = input.vehicleId
            ? { connect: { id: input.vehicleId } }
            : { disconnect: true };
        }
        if (input.departureAt) {
          const departureAt = new Date(input.departureAt);
          if (Number.isNaN(departureAt.getTime())) {
            throw new ForbiddenException('Invalid departureAt');
          }
          data.departureAt = departureAt;
        }
        if (input.seatsTotal !== undefined) {
          if (input.seatsTotal <= 0)
            throw new ForbiddenException('seatsTotal must be > 0');
          data.seatsTotal = input.seatsTotal;
          data.seatsAvailable = Math.max(0, input.seatsTotal - bookedSeats);
        }

        const updated = await tx.trip.update({
          where: { id: tripId },
          data,
        });

        await this.audit.logTx(tx, {
          action: AuditAction.TripForceUpdate,
          entityType: 'trip',
          entityId: tripId,
          severity: 'critical',
          metadata: {
            reason: input.reason,
            before: {
              price: before.price,
              seatsTotal: before.seatsTotal,
              seatsAvailable: before.seatsAvailable,
              departureAt: before.departureAt,
              fromCityId: before.fromCityId,
              toCityId: before.toCityId,
              vehicleId: before.vehicleId,
            },
            after: {
              price: updated.price,
              seatsTotal: updated.seatsTotal,
              seatsAvailable: updated.seatsAvailable,
              departureAt: updated.departureAt,
              fromCityId: updated.fromCityId,
              toCityId: updated.toCityId,
              vehicleId: updated.vehicleId,
            },
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async forceTransitionTrip(
    tripId: string,
    transition: 'publish' | 'start' | 'complete' | 'cancel',
    reason: string,
  ) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const trip = await tx.trip.findUnique({
          where: { id: tripId },
          include: {
            bookings: true,
          },
        });
        if (!trip) throw new NotFoundException('Trip not found');

        let nextStatus = trip.status;
        const now = new Date();

        if (transition === 'publish') {
          await tx.trip.update({
            where: { id: tripId },
            data: { status: TripStatus.published },
          });
          nextStatus = TripStatus.published;
        } else if (transition === 'start') {
          await tx.trip.update({
            where: { id: tripId },
            data: { status: TripStatus.started, startedAt: now },
          });
          nextStatus = TripStatus.started;
        } else if (transition === 'complete') {
          await tx.trip.update({
            where: { id: tripId },
            data: { status: TripStatus.completed, completedAt: now },
          });
          nextStatus = TripStatus.completed;
          await tx.booking.updateMany({
            where: {
              tripId,
              status: { in: [BookingStatus.confirmed, BookingStatus.paid] },
            },
            data: { status: BookingStatus.completed, completedAt: now },
          });
        } else {
          await tx.trip.update({
            where: { id: tripId },
            data: {
              status: TripStatus.canceled,
              canceledAt: now,
              cancelReason: reason,
            },
          });
          nextStatus = TripStatus.canceled;

          await tx.tripRequest.updateMany({
            where: { tripId, status: RequestStatus.pending },
            data: {
              status: RequestStatus.canceled,
              respondedAt: now,
              rejectionReason: reason,
            },
          });

          await tx.offer.updateMany({
            where: { request: { tripId }, status: OfferStatus.active },
            data: {
              status: OfferStatus.canceled,
              respondedAt: now,
              responseReason: reason,
            },
          });

          const cancellableBookings = trip.bookings.filter((booking) =>
            this.isSeatHoldingBookingStatus(booking.status),
          );
          for (const booking of cancellableBookings) {
            await tx.booking.update({
              where: { id: booking.id },
              data: {
                status: BookingStatus.canceled,
                canceledAt: now,
                cancellationFeeAmount: 0,
              },
            });
            await tx.trip.update({
              where: { id: tripId },
              data: { seatsAvailable: { increment: booking.seats } },
            });
            await tx.tripRequest.update({
              where: { id: booking.requestId },
              data: {
                status: RequestStatus.canceled,
                respondedAt: now,
                rejectionReason: reason,
              },
            });
          }
        }

        await this.audit.logTx(tx, {
          action: AuditAction.TripForceTransition,
          entityType: 'trip',
          entityId: tripId,
          severity: 'critical',
          metadata: {
            reason,
            transition,
            fromStatus: trip.status,
            toStatus: nextStatus,
          },
        });

        const updatedTrip = await tx.trip.findUnique({ where: { id: tripId } });
        if (!updatedTrip) throw new NotFoundException('Trip not found');
        return updatedTrip;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listRequests(params: {
    status?: RequestStatus;
    tripId?: string;
    passengerId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: Prisma.TripRequestWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.tripId ? { tripId: params.tripId } : {}),
      ...(params.passengerId ? { passengerId: params.passengerId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.tripRequest.findMany({
        where,
        include: {
          passenger: { select: { id: true, phone: true, role: true } },
          trip: { select: { id: true, driverId: true, status: true } },
          booking: true,
          offers: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tripRequest.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getRequestById(requestId: string) {
    const item = await this.prisma.tripRequest.findUnique({
      where: { id: requestId },
      include: {
        passenger: { select: { id: true, phone: true, role: true } },
        trip: {
          include: {
            fromCity: true,
            toCity: true,
            driver: { select: { id: true, phone: true } },
          },
        },
        booking: true,
        offers: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!item) throw new NotFoundException('Request not found');
    return item;
  }

  async forceCancelRequest(requestId: string, reason: string) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const request = await tx.tripRequest.findUnique({
          where: { id: requestId },
          include: { booking: true },
        });
        if (!request) throw new NotFoundException('Request not found');
        const now = new Date();

        if (
          request.booking &&
          this.isSeatHoldingBookingStatus(request.booking.status)
        ) {
          await tx.booking.update({
            where: { id: request.booking.id },
            data: {
              status: BookingStatus.canceled,
              canceledAt: now,
              cancellationFeeAmount: 0,
            },
          });
          await tx.trip.update({
            where: { id: request.tripId },
            data: { seatsAvailable: { increment: request.booking.seats } },
          });
        }

        const updated = await tx.tripRequest.update({
          where: { id: requestId },
          data: {
            status: RequestStatus.canceled,
            respondedAt: now,
            rejectionReason: reason,
          },
        });

        await tx.offer.updateMany({
          where: { requestId, status: OfferStatus.active },
          data: {
            status: OfferStatus.canceled,
            respondedAt: now,
            responseReason: reason,
          },
        });

        await tx.negotiationSession.updateMany({
          where: { requestId },
          data: { state: 'canceled', lastOfferId: null },
        });

        await this.audit.logTx(tx, {
          action: AuditAction.RequestForceCancel,
          entityType: 'tripRequest',
          entityId: requestId,
          severity: 'critical',
          metadata: {
            reason,
            previousStatus: request.status,
          },
        });

        await this.outbox.enqueueTx(tx, {
          topic: OutboxTopic.RequestCanceled,
          aggregateType: 'tripRequest',
          aggregateId: requestId,
          idempotencyKey: `request:${requestId}:force-canceled`,
          payload: {
            requestId,
            tripId: request.tripId,
            passengerId: request.passengerId,
            reason,
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listOffers(params: {
    status?: OfferStatus;
    requestId?: string;
    proposerId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: Prisma.OfferWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.requestId ? { requestId: params.requestId } : {}),
      ...(params.proposerId ? { proposerId: params.proposerId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.offer.findMany({
        where,
        include: {
          proposer: { select: { id: true, phone: true, role: true } },
          request: {
            select: { id: true, status: true, tripId: true, passengerId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.offer.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getOfferById(offerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        proposer: { select: { id: true, phone: true, role: true } },
        request: {
          include: {
            trip: {
              select: {
                id: true,
                driverId: true,
                status: true,
                seatsAvailable: true,
              },
            },
            booking: true,
          },
        },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  async forceOfferAction(
    offerId: string,
    action: 'accept' | 'reject' | 'cancel',
    reason: string,
  ) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const offer = await tx.offer.findUnique({
          where: { id: offerId },
          include: {
            request: {
              include: {
                trip: true,
                booking: true,
              },
            },
          },
        });
        if (!offer) throw new NotFoundException('Offer not found');

        if (action === 'accept') {
          if (offer.status !== OfferStatus.active) {
            throw new ForbiddenException('Only active offer can be accepted');
          }
          if (offer.request.status !== RequestStatus.pending) {
            throw new ForbiddenException('Request is not pending');
          }
          if (offer.request.seats > offer.request.trip.seatsAvailable) {
            throw new ForbiddenException('Not enough seats available');
          }

          const seatUpdate = await tx.trip.updateMany({
            where: {
              id: offer.request.tripId,
              seatsAvailable: { gte: offer.request.seats },
            },
            data: { seatsAvailable: { decrement: offer.request.seats } },
          });
          if (seatUpdate.count !== 1) {
            throw new ForbiddenException('Seats race condition');
          }

          await tx.tripRequest.update({
            where: { id: offer.requestId },
            data: {
              status: RequestStatus.accepted,
              respondedAt: new Date(),
              price: offer.price,
            },
          });

          const booking = offer.request.booking
            ? await tx.booking.update({
                where: { id: offer.request.booking.id },
                data: {
                  status: BookingStatus.confirmed,
                  price: offer.price,
                  seats: offer.seats,
                  currency: offer.currency,
                },
              })
            : await tx.booking.create({
                data: {
                  requestId: offer.requestId,
                  tripId: offer.request.tripId,
                  passengerId: offer.request.passengerId,
                  seats: offer.seats,
                  price: offer.price,
                  currency: offer.currency,
                  status: BookingStatus.confirmed,
                },
              });

          await tx.offer.update({
            where: { id: offerId },
            data: {
              status: OfferStatus.accepted,
              respondedAt: new Date(),
              responseReason: reason,
            },
          });

          await tx.offer.updateMany({
            where: {
              requestId: offer.requestId,
              id: { not: offerId },
              status: OfferStatus.active,
            },
            data: {
              status: OfferStatus.canceled,
              respondedAt: new Date(),
              responseReason: 'Another offer accepted',
            },
          });

          await tx.negotiationSession.updateMany({
            where: { requestId: offer.requestId },
            data: { state: 'accepted', lastOfferId: offerId },
          });

          await this.outbox.enqueueTx(tx, {
            topic: OutboxTopic.OfferAccepted,
            aggregateType: 'offer',
            aggregateId: offerId,
            idempotencyKey: `offer:${offerId}:force-accepted`,
            payload: {
              offerId,
              requestId: offer.requestId,
              bookingId: booking.id,
              reason,
            },
          });
        } else {
          const nextStatus =
            action === 'reject' ? OfferStatus.rejected : OfferStatus.canceled;
          await tx.offer.update({
            where: { id: offerId },
            data: {
              status: nextStatus,
              respondedAt: new Date(),
              responseReason: reason,
            },
          });
          if (action === 'cancel') {
            await tx.negotiationSession.updateMany({
              where: { requestId: offer.requestId },
              data: { state: 'canceled', lastOfferId: offerId },
            });
          }
        }

        await this.audit.logTx(tx, {
          action: AuditAction.OfferForceAction,
          entityType: 'offer',
          entityId: offerId,
          severity: 'critical',
          metadata: {
            reason,
            action,
            previousStatus: offer.status,
          },
        });

        return tx.offer.findUnique({ where: { id: offerId } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listBookings(params: {
    status?: BookingStatus;
    tripId?: string;
    passengerId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: Prisma.BookingWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.tripId ? { tripId: params.tripId } : {}),
      ...(params.passengerId ? { passengerId: params.passengerId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: {
          passenger: { select: { id: true, phone: true, role: true } },
          request: { select: { id: true, status: true, passengerId: true } },
          trip: {
            select: {
              id: true,
              status: true,
              departureAt: true,
              fromCity: true,
              toCity: true,
              driver: { select: { id: true, phone: true } },
            },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getBookingById(bookingId: string) {
    const item = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        passenger: { select: { id: true, phone: true, role: true } },
        request: {
          include: {
            offers: { orderBy: { createdAt: 'desc' } },
          },
        },
        trip: {
          include: {
            fromCity: true,
            toCity: true,
            driver: { select: { id: true, phone: true, role: true } },
          },
        },
        payments: true,
      },
    });
    if (!item) throw new NotFoundException('Booking not found');
    return item;
  }

  async forceUpdateBooking(
    bookingId: string,
    input: {
      seats?: number;
      price?: number;
      currency?: string;
      reason: string;
    },
  ) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const before = await tx.booking.findUnique({
          where: { id: bookingId },
          include: { trip: true },
        });
        if (!before) throw new NotFoundException('Booking not found');

        const data: Prisma.BookingUpdateInput = {};

        if (input.price !== undefined) data.price = input.price;
        if (input.currency !== undefined) data.currency = input.currency;

        if (input.seats !== undefined && input.seats !== before.seats) {
          if (input.seats <= 0) {
            throw new ForbiddenException('seats must be > 0');
          }

          const seatDelta = input.seats - before.seats;
          if (seatDelta > 0 && this.isSeatHoldingBookingStatus(before.status)) {
            const seatUpdate = await tx.trip.updateMany({
              where: {
                id: before.tripId,
                seatsAvailable: { gte: seatDelta },
              },
              data: { seatsAvailable: { decrement: seatDelta } },
            });
            if (seatUpdate.count !== 1) {
              throw new ForbiddenException('Not enough seats available');
            }
          } else if (
            seatDelta < 0 &&
            this.isSeatHoldingBookingStatus(before.status)
          ) {
            await tx.trip.update({
              where: { id: before.tripId },
              data: { seatsAvailable: { increment: -seatDelta } },
            });
          }
          data.seats = input.seats;
        }

        const updated = await tx.booking.update({
          where: { id: bookingId },
          data,
        });

        await this.audit.logTx(tx, {
          action: AuditAction.BookingForceUpdate,
          entityType: 'booking',
          entityId: bookingId,
          severity: 'critical',
          metadata: {
            reason: input.reason,
            before: {
              seats: before.seats,
              price: before.price,
              currency: before.currency,
            },
            after: {
              seats: updated.seats,
              price: updated.price,
              currency: updated.currency,
            },
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async forceCancelBooking(
    bookingId: string,
    input: { reason: string; cancellationFeeAmount?: number },
  ) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: { trip: true, request: true },
        });
        if (!booking) throw new NotFoundException('Booking not found');

        if (booking.status === BookingStatus.canceled) {
          return booking;
        }

        const now = new Date();
        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.canceled,
            canceledAt: now,
            cancellationFeeAmount: input.cancellationFeeAmount ?? 0,
          },
        });

        if (this.isSeatHoldingBookingStatus(booking.status)) {
          await tx.trip.update({
            where: { id: booking.tripId },
            data: { seatsAvailable: { increment: booking.seats } },
          });
        }

        await tx.tripRequest.update({
          where: { id: booking.requestId },
          data: {
            status: RequestStatus.canceled,
            respondedAt: now,
            rejectionReason: input.reason,
          },
        });

        await tx.offer.updateMany({
          where: {
            requestId: booking.requestId,
            status: OfferStatus.active,
          },
          data: {
            status: OfferStatus.canceled,
            respondedAt: now,
            responseReason: input.reason,
          },
        });

        await this.audit.logTx(tx, {
          action: AuditAction.BookingForceCancel,
          entityType: 'booking',
          entityId: bookingId,
          severity: 'critical',
          metadata: {
            reason: input.reason,
            previousStatus: booking.status,
            cancellationFeeAmount: input.cancellationFeeAmount ?? 0,
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async forceCompleteBooking(bookingId: string, reason: string) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
        });
        if (!booking) throw new NotFoundException('Booking not found');

        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.completed,
            completedAt: new Date(),
          },
        });

        await this.audit.logTx(tx, {
          action: AuditAction.BookingForceComplete,
          entityType: 'booking',
          entityId: bookingId,
          severity: 'critical',
          metadata: {
            reason,
            previousStatus: booking.status,
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listVehicles(params: {
    userId?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const where: Prisma.VehicleWhereInput = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.q
        ? {
            OR: [
              { make: { contains: params.q, mode: 'insensitive' } },
              { model: { contains: params.q, mode: 'insensitive' } },
              { plateNo: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        include: {
          user: { select: { id: true, phone: true, role: true } },
          trips: {
            select: {
              id: true,
              status: true,
              departureAt: true,
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getVehicleById(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        user: { select: { id: true, phone: true, role: true } },
        trips: {
          include: {
            fromCity: true,
            toCity: true,
          },
          orderBy: { departureAt: 'desc' },
        },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async forceUpdateVehicle(
    vehicleId: string,
    input: {
      make?: string;
      model?: string;
      plateNo?: string;
      color?: string;
      seats?: number;
      reason: string;
    },
  ) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const before = await tx.vehicle.findUnique({
          where: { id: vehicleId },
        });
        if (!before) throw new NotFoundException('Vehicle not found');

        const updated = await tx.vehicle.update({
          where: { id: vehicleId },
          data: {
            ...(input.make !== undefined ? { make: input.make } : {}),
            ...(input.model !== undefined ? { model: input.model } : {}),
            ...(input.plateNo !== undefined ? { plateNo: input.plateNo } : {}),
            ...(input.color !== undefined ? { color: input.color } : {}),
            ...(input.seats !== undefined ? { seats: input.seats } : {}),
          },
        });

        await this.audit.logTx(tx, {
          action: AuditAction.VehicleForceUpdate,
          entityType: 'vehicle',
          entityId: vehicleId,
          severity: 'critical',
          metadata: {
            reason: input.reason,
            before: {
              make: before.make,
              model: before.model,
              plateNo: before.plateNo,
              color: before.color,
              seats: before.seats,
            },
            after: {
              make: updated.make,
              model: updated.model,
              plateNo: updated.plateNo,
              color: updated.color,
              seats: updated.seats,
            },
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async forceDeleteVehicle(vehicleId: string, reason: string) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const vehicle = await tx.vehicle.findUnique({
          where: { id: vehicleId },
        });
        if (!vehicle) throw new NotFoundException('Vehicle not found');

        const activeTrips = await tx.trip.count({
          where: {
            vehicleId,
            status: {
              in: [TripStatus.draft, TripStatus.published, TripStatus.started],
            },
          },
        });
        if (activeTrips > 0) {
          throw new ForbiddenException(
            'Vehicle has active trips; reassign or cancel trips before delete',
          );
        }

        await tx.vehicle.delete({ where: { id: vehicleId } });

        await this.audit.logTx(tx, {
          action: AuditAction.VehicleForceDelete,
          entityType: 'vehicle',
          entityId: vehicleId,
          severity: 'critical',
          metadata: {
            reason,
            plateNo: vehicle.plateNo,
          },
        });

        return { ok: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async forceUpdateDriverProfile(
    userId: string,
    input: {
      fullName?: string;
      licenseNo?: string;
      passportNo?: string;
      status?: DriverStatus;
      rejectionReason?: string;
      reason: string;
    },
  ) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const before = await tx.driverProfile.findUnique({
          where: { userId },
        });
        if (!before) throw new NotFoundException('Driver profile not found');

        const data: Prisma.DriverProfileUpdateInput = {
          ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
          ...(input.licenseNo !== undefined
            ? { licenseNo: input.licenseNo }
            : {}),
          ...(input.passportNo !== undefined
            ? { passportNo: input.passportNo }
            : {}),
          ...(input.rejectionReason !== undefined
            ? { rejectionReason: input.rejectionReason }
            : {}),
        };

        if (input.status !== undefined) {
          data.status = input.status;
          if (input.status === DriverStatus.verified) {
            data.verifiedAt = new Date();
            data.rejectionReason = null;
            await tx.user.update({
              where: { id: userId },
              data: { role: Role.driver },
            });
          }
          if (input.status === DriverStatus.rejected) {
            data.verifiedAt = null;
          }
        }

        const updated = await tx.driverProfile.update({
          where: { userId },
          data,
        });

        await this.audit.logTx(tx, {
          action: AuditAction.DriverVerify,
          entityType: 'driverProfile',
          entityId: updated.id,
          severity: 'critical',
          metadata: {
            reason: input.reason,
            before: {
              status: before.status,
              fullName: before.fullName,
              licenseNo: before.licenseNo,
              passportNo: before.passportNo,
              rejectionReason: before.rejectionReason,
            },
            after: {
              status: updated.status,
              fullName: updated.fullName,
              licenseNo: updated.licenseNo,
              passportNo: updated.passportNo,
              rejectionReason: updated.rejectionReason,
            },
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listRadars(params: {
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;

    const rows = await this.prisma.$queryRaw<RadarPoiRow[]>`
      SELECT
        p."id",
        p."name",
        p."type",
        p."description",
        p."radiusMeters",
        p."isActive",
        p."createdAt",
        p."updatedAt",
        ST_Y(p."location"::geometry) AS "lat",
        ST_X(p."location"::geometry) AS "lon"
      FROM "Poi" p
      WHERE p."type" = ${PoiType.speed_camera}::"PoiType"
      ${params.isActive === undefined ? Prisma.empty : Prisma.sql`AND p."isActive" = ${params.isActive}`}
      ORDER BY p."createdAt" DESC
      OFFSET ${(page - 1) * pageSize}
      LIMIT ${pageSize}
    `;

    const totalRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count"
      FROM "Poi" p
      WHERE p."type" = ${PoiType.speed_camera}::"PoiType"
      ${params.isActive === undefined ? Prisma.empty : Prisma.sql`AND p."isActive" = ${params.isActive}`}
    `;

    return {
      items: rows,
      total: Number(totalRows[0]?.count ?? 0n),
      page,
      pageSize,
    };
  }

  async createRadar(input: {
    name: string;
    lat: number;
    lon: number;
    description?: string;
    radiusMeters?: number;
    isActive?: boolean;
    type?: PoiType;
    reason: string;
  }) {
    const id = randomUUID();
    const type = input.type ?? PoiType.speed_camera;
    await this.prisma.$executeRaw`
      INSERT INTO "Poi" (
        "id","name","type","description","location","radiusMeters","isActive","createdAt","updatedAt"
      ) VALUES (
        ${id},
        ${input.name},
        ${type}::"PoiType",
        ${input.description ?? null},
        ST_SetSRID(ST_MakePoint(${input.lon}, ${input.lat}), 4326)::geography,
        ${input.radiusMeters ?? 1200},
        ${input.isActive ?? true},
        NOW(),
        NOW()
      )
    `;

    const created = await this.prisma.$queryRaw<RadarPoiRow[]>`
      SELECT
        p."id",
        p."name",
        p."type",
        p."description",
        p."radiusMeters",
        p."isActive",
        p."createdAt",
        p."updatedAt",
        ST_Y(p."location"::geometry) AS "lat",
        ST_X(p."location"::geometry) AS "lon"
      FROM "Poi" p
      WHERE p."id" = ${id}
      LIMIT 1
    `;

    await this.audit.log({
      action: AuditAction.RadarCreate,
      entityType: 'poi',
      entityId: id,
      severity: 'critical',
      metadata: {
        reason: input.reason,
        type,
      },
    });

    return created[0];
  }

  async updateRadar(
    radarId: string,
    input: {
      name?: string;
      type?: PoiType;
      lat?: number;
      lon?: number;
      description?: string;
      radiusMeters?: number;
      isActive?: boolean;
      reason: string;
    },
  ) {
    const pointSql =
      input.lat !== undefined && input.lon !== undefined
        ? Prisma.sql`ST_SetSRID(ST_MakePoint(${input.lon}, ${input.lat}), 4326)::geography`
        : Prisma.sql`"location"`;

    const before = await this.prisma.poi.findUnique({
      where: { id: radarId },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        radiusMeters: true,
        isActive: true,
      },
    });
    if (!before || before.type !== PoiType.speed_camera) {
      throw new NotFoundException('Radar not found');
    }

    const rows = await this.prisma.$queryRaw<RadarPoiRow[]>`
      UPDATE "Poi"
      SET
        "name" = COALESCE(${input.name ?? null}, "name"),
        "type" = COALESCE(${input.type ?? null}::"PoiType", "type"),
        "description" = COALESCE(${input.description ?? null}, "description"),
        "radiusMeters" = COALESCE(${input.radiusMeters ?? null}, "radiusMeters"),
        "isActive" = COALESCE(${input.isActive ?? null}, "isActive"),
        "location" = ${pointSql},
        "updatedAt" = NOW()
      WHERE "id" = ${radarId}
      RETURNING
        "id","name","type","description","radiusMeters","isActive","createdAt","updatedAt",
        ST_Y("location"::geometry) AS "lat",
        ST_X("location"::geometry) AS "lon"
    `;
    const updated = rows[0];
    if (!updated) throw new NotFoundException('Radar not found');

    await this.audit.log({
      action: AuditAction.RadarUpdate,
      entityType: 'poi',
      entityId: radarId,
      severity: 'critical',
      metadata: {
        reason: input.reason,
        before,
        after: {
          name: updated.name,
          type: updated.type,
          description: updated.description,
          radiusMeters: updated.radiusMeters,
          isActive: updated.isActive,
          lat: updated.lat,
          lon: updated.lon,
        },
      },
    });

    return updated;
  }

  async deleteRadar(radarId: string, reason: string) {
    const radar = await this.prisma.poi.findUnique({
      where: { id: radarId },
      select: { id: true, type: true, name: true },
    });
    if (!radar || radar.type !== PoiType.speed_camera) {
      throw new NotFoundException('Radar not found');
    }

    await this.prisma.poi.delete({ where: { id: radarId } });
    await this.audit.log({
      action: AuditAction.RadarDelete,
      entityType: 'poi',
      entityId: radarId,
      severity: 'critical',
      metadata: {
        reason,
        name: radar.name,
      },
    });
    return { ok: true };
  }

  async importRadars(
    items: Array<{
      name: string;
      lat: number;
      lon: number;
      description?: string;
      radiusMeters?: number;
      isActive?: boolean;
      type?: PoiType;
    }>,
    reason: string,
  ) {
    const created: RadarPoiRow[] = [];
    for (const item of items) {
      const row = await this.createRadar({
        ...item,
        type: item.type ?? PoiType.speed_camera,
        reason,
      });
      created.push(row);
    }
    return { count: created.length, items: created };
  }

  async exportRadars() {
    const all = await this.listRadars({ page: 1, pageSize: 10000 });
    return all.items;
  }

  async sendNotificationToUser(
    userId: string,
    input: {
      type?: string;
      title?: string;
      message: string;
      payload?: Prisma.InputJsonValue;
      reason: string;
    },
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: input.type ?? 'system',
        title: input.title ?? null,
        message: input.message,
        payload: input.payload ?? Prisma.JsonNull,
      },
    });

    await this.audit.log({
      action: AuditAction.NotificationSendUser,
      entityType: 'notification',
      entityId: notification.id,
      severity: 'critical',
      metadata: {
        reason: input.reason,
        userId,
      },
    });

    return notification;
  }

  async broadcastNotifications(input: {
    type?: string;
    title?: string;
    message: string;
    payload?: Prisma.InputJsonValue;
    reason: string;
  }) {
    const userIds = await this.prisma.user.findMany({
      select: { id: true },
    });

    if (!userIds.length) {
      return { count: 0 };
    }

    await this.prisma.notification.createMany({
      data: userIds.map((user) => ({
        userId: user.id,
        type: input.type ?? 'broadcast',
        title: input.title ?? null,
        message: input.message,
        payload: input.payload ?? Prisma.JsonNull,
      })),
    });

    await this.audit.log({
      action: AuditAction.NotificationBroadcast,
      entityType: 'notification',
      severity: 'critical',
      metadata: {
        reason: input.reason,
        recipients: userIds.length,
      },
    });

    return { count: userIds.length };
  }

  async sendSegmentNotifications(input: {
    roles?: Role[];
    isBanned?: boolean;
    driverStatus?: DriverStatus;
    type?: string;
    title?: string;
    message: string;
    payload?: Prisma.InputJsonValue;
    reason: string;
  }) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(input.roles?.length ? { role: { in: input.roles } } : {}),
        ...(input.isBanned !== undefined ? { isBanned: input.isBanned } : {}),
        ...(input.driverStatus
          ? {
              driverProfile: {
                is: {
                  status: input.driverStatus,
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });

    if (!users.length) {
      return { count: 0 };
    }

    await this.prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: input.type ?? 'segment',
        title: input.title ?? null,
        message: input.message,
        payload: input.payload ?? Prisma.JsonNull,
      })),
    });

    await this.audit.log({
      action: AuditAction.NotificationSendSegment,
      entityType: 'notification',
      severity: 'critical',
      metadata: {
        reason: input.reason,
        recipients: users.length,
        filters: {
          roles: input.roles ?? null,
          isBanned: input.isBanned ?? null,
          driverStatus: input.driverStatus ?? null,
        },
      },
    });

    return { count: users.length };
  }

  async getSupportTicketById(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, phone: true, role: true } },
        booking: {
          select: {
            id: true,
            status: true,
            tripId: true,
            passengerId: true,
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async assignSupportTicket(ticketId: string, adminId: string, reason: string) {
    const [ticket, assignee] = await Promise.all([
      this.prisma.supportTicket.findUnique({
        where: { id: ticketId },
      }),
      this.prisma.user.findUnique({
        where: { id: adminId },
        select: { id: true, role: true },
      }),
    ]);
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!assignee) throw new NotFoundException('Assignee not found');
    if (!this.isAdminAssignableRole(assignee.role)) {
      throw new ForbiddenException('Assignee must be admin/moderator/support');
    }

    await this.audit.log({
      action: AuditAction.TicketAssign,
      entityType: 'supportTicket',
      entityId: ticketId,
      severity: 'critical',
      metadata: {
        reason,
        assigneeId: adminId,
      },
    });

    return {
      ok: true,
      ticketId,
      assigneeId: adminId,
    };
  }

  async commentSupportTicket(
    ticketId: string,
    comment: string,
    reason: string,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, userId: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    await this.audit.log({
      action: AuditAction.TicketComment,
      entityType: 'supportTicket',
      entityId: ticketId,
      severity: 'critical',
      metadata: {
        reason,
        comment,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: 'support.ticket.comment',
        title: 'Ticket update',
        message: comment,
        payload: {
          ticketId,
        } satisfies Prisma.JsonObject,
      },
    });

    return { ok: true };
  }

  async escalateSupportTicket(ticketId: string, reason: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const updated =
      ticket.status === SupportTicketStatus.in_progress
        ? ticket
        : await this.prisma.supportTicket.update({
            where: { id: ticketId },
            data: { status: SupportTicketStatus.in_progress },
          });

    await this.audit.log({
      action: AuditAction.TicketEscalate,
      entityType: 'supportTicket',
      entityId: ticketId,
      severity: 'critical',
      metadata: {
        reason,
        previousStatus: ticket.status,
        nextStatus: updated.status,
      },
    });

    return updated;
  }

  async listUserSessions(params: {
    userId?: string;
    revoked?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const where: Prisma.UserSessionWhereInput = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.revoked === undefined
        ? {}
        : params.revoked
          ? { revokedAt: { not: null } }
          : { revokedAt: null }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.userSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, phone: true, role: true },
          },
        },
      }),
      this.prisma.userSession.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async listDevices(params: {
    userId?: string;
    platform?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const where: Prisma.DeviceWhereInput = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.platform
        ? {
            platform: {
              equals: params.platform,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.device.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, phone: true, role: true },
          },
        },
      }),
      this.prisma.device.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async listPaymentAttempts(params: {
    paymentId?: string;
    status?: PaymentStatus;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const where: Prisma.PaymentAttemptWhereInput = {
      ...(params.paymentId ? { paymentId: params.paymentId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.paymentAttempt.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { seq: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          payment: {
            select: {
              id: true,
              bookingId: true,
              status: true,
              amount: true,
              currency: true,
              provider: true,
            },
          },
        },
      }),
      this.prisma.paymentAttempt.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async listPaymentEvents(params: {
    paymentId?: string;
    provider?: PaymentProvider;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const where: Prisma.PaymentEventWhereInput = {
      ...(params.paymentId ? { paymentId: params.paymentId } : {}),
      ...(params.provider ? { provider: params.provider } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.paymentEvent.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          payment: {
            select: {
              id: true,
              bookingId: true,
              status: true,
              amount: true,
              currency: true,
            },
          },
        },
      }),
      this.prisma.paymentEvent.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async listPaymentLedger(params: {
    paymentId?: string;
    bookingId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const where: Prisma.PaymentLedgerEntryWhereInput = {
      ...(params.paymentId ? { paymentId: params.paymentId } : {}),
      ...(params.bookingId ? { bookingId: params.bookingId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.paymentLedgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          payment: {
            select: { id: true, status: true, provider: true },
          },
          booking: {
            select: { id: true, tripId: true, passengerId: true, status: true },
          },
        },
      }),
      this.prisma.paymentLedgerEntry.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async listFareQuotes(params: {
    userId?: string;
    tripId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const where: Prisma.FareQuoteWhereInput = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.tripId ? { tripId: params.tripId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.fareQuote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, phone: true, role: true },
          },
          trip: {
            select: {
              id: true,
              status: true,
              fromCity: { select: { id: true, name: true } },
              toCity: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.fareQuote.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async listOtpCodes(params: {
    phone?: string;
    purpose?: OtpPurpose;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const where: Prisma.OtpCodeWhereInput = {
      ...(params.phone
        ? {
            phone: {
              contains: params.phone,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
      ...(params.purpose ? { purpose: params.purpose } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.otpCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.otpCode.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async listOutboxEvents(params: {
    status?: OutboxStatus;
    topic?: string;
    aggregateType?: string;
    aggregateId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const where: Prisma.OutboxEventWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.topic
        ? {
            topic: {
              contains: params.topic,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
      ...(params.aggregateType ? { aggregateType: params.aggregateType } : {}),
      ...(params.aggregateId ? { aggregateId: params.aggregateId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.outboxEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.outboxEvent.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async retryOutboxEvent(eventId: string, reason: string) {
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const before = await tx.outboxEvent.findUnique({
          where: { id: eventId },
        });
        if (!before) {
          throw new NotFoundException('Outbox event not found');
        }

        const updated = await tx.outboxEvent.update({
          where: { id: eventId },
          data: {
            status: OutboxStatus.NEW,
            lockedAt: null,
            lockedBy: null,
            nextRetryAt: null,
            lastError: null,
          },
        });

        await this.audit.logTx(tx, {
          action: AuditAction.OutboxRetry,
          entityType: 'outboxEvent',
          entityId: eventId,
          severity: 'critical',
          metadata: {
            reason,
            before: {
              status: before.status,
              attempts: before.attempts,
              lastError: before.lastError,
            },
            after: {
              status: updated.status,
              attempts: updated.attempts,
            },
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listGeoSamples(params: {
    tripId?: string;
    driverId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 100;

    const conditions: Prisma.Sql[] = [];
    if (params.tripId) {
      conditions.push(Prisma.sql`dls."tripId" = ${params.tripId}`);
    }
    if (params.driverId) {
      conditions.push(Prisma.sql`dls."driverId" = ${params.driverId}`);
    }
    const whereSql =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

    const items = await this.prisma.$queryRaw<
      Array<{
        id: string;
        tripId: string;
        driverId: string;
        speedKmh: number | null;
        headingDeg: number | null;
        capturedAt: Date;
        createdAt: Date;
        lat: number;
        lon: number;
      }>
    >`
      SELECT
        dls."id",
        dls."tripId",
        dls."driverId",
        dls."speedKmh",
        dls."headingDeg",
        dls."capturedAt",
        dls."createdAt",
        ST_Y(dls."point"::geometry) AS "lat",
        ST_X(dls."point"::geometry) AS "lon"
      FROM "DriverLocationSample" dls
      ${whereSql}
      ORDER BY dls."capturedAt" DESC
      OFFSET ${(page - 1) * pageSize}
      LIMIT ${pageSize}
    `;

    const countRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count"
      FROM "DriverLocationSample" dls
      ${whereSql}
    `;

    return {
      items,
      total: Number(countRows[0]?.count ?? 0n),
      page,
      pageSize,
    };
  }

  getSystemSettings() {
    return {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      apiPrefix: process.env.API_PREFIX ?? 'api',
      metricsEnabled: String(process.env.METRICS_ENABLED ?? 'true') === 'true',
      swaggerEnabled: String(process.env.SWAGGER_ENABLED ?? 'false') === 'true',
      realtimeEnabled:
        String(process.env.REALTIME_ENABLED ?? 'false') === 'true',
      sentryEnabled: String(process.env.SENTRY_ENABLED ?? 'true') === 'true',
      routingProvider: process.env.ROUTING_PROVIDER ?? 'mock',
      paymentProvider: process.env.PAYMENT_PROVIDER ?? 'click',
      geoRetentionEnabled:
        String(process.env.GEO_RETENTION_ENABLED ?? 'true') === 'true',
    };
  }
}
