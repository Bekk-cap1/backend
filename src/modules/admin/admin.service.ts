import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { DriversService } from '../drivers/drivers.service';
import { AdminDriversQueryDto } from './dto/admin-drivers-query.dto';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import {
  PaymentStatus,
  Role,
  SupportTicketStatus,
  Prisma,
} from '@prisma/client';

import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit.actions';

import { OutboxService } from '../../outbox/outbox.service';
import { OutboxTopic } from '../../outbox/outbox.topics';
import {
  isSuperAdminImmutable,
  isSuperAdminPhone,
} from '../../common/auth/super-admin.util';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drivers: DriversService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  private assertSuperAdminNotBannedOrDemoted(params: {
    phone: string;
    nextRole?: Role;
    action: 'ban' | 'role-change';
  }) {
    if (!isSuperAdminImmutable()) return;
    if (!isSuperAdminPhone(params.phone)) return;

    if (params.action === 'ban') {
      throw new ForbiddenException('Superadmin cannot be banned');
    }

    if (params.nextRole && params.nextRole !== Role.admin) {
      throw new ForbiddenException('Superadmin role cannot be changed');
    }
  }

  async listDrivers(q: AdminDriversQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const where = {
      ...(q.status ? { status: q.status } : {}),
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

  async listAudit(q: AdminAuditQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;

    const where: Prisma.AuditLogWhereInput = {
      ...(q.actorId ? { actorId: q.actorId } : {}),
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
      ...(q.action ? { action: q.action } : {}),
      ...(q.severity ? { severity: q.severity } : {}),
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
  async verifyDriver(userId: string) {
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
          phone: before.phone,
          nextRole: role,
          action: 'role-change',
        });

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
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: Prisma.UserWhereInput = {
      ...(params.role ? { role: params.role } : {}),
      ...(params.isBanned !== undefined ? { isBanned: params.isBanned } : {}),
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
}
