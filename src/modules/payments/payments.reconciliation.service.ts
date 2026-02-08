import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentStatus } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit.actions';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class PaymentsReconciliationService {
  private readonly logger = new Logger(PaymentsReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly metrics: MetricsService,
  ) {}

  @Cron(process.env.PAYMENT_RECONCILE_CRON ?? '*/10 * * * *')
  async reconcilePendingPayments() {
    if (String(process.env.PAYMENT_RECONCILE_ENABLED ?? 'true') !== 'true') {
      return;
    }

    const lockKey = 'locks:payments:reconcile';
    const lockToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const lockSec = Number(process.env.PAYMENT_RECONCILE_LOCK_SEC ?? 120);
    const acquired = await this.redis.raw.set(
      lockKey,
      lockToken,
      'EX',
      lockSec,
      'NX',
    );
    if (acquired !== 'OK') return;

    const staleMinutes = Number(
      process.env.PAYMENT_RECONCILE_STALE_MINUTES ?? 60,
    );
    const batchSize = Number(process.env.PAYMENT_RECONCILE_BATCH ?? 200);
    const cutoff = new Date(Date.now() - staleMinutes * 60_000);

    try {
      const stale = await this.prisma.payment.findMany({
        where: {
          status: { in: [PaymentStatus.created, PaymentStatus.pending] },
          createdAt: { lt: cutoff },
        },
        orderBy: { createdAt: 'asc' },
        take: batchSize,
        select: {
          id: true,
          bookingId: true,
          amount: true,
          currency: true,
          createdAt: true,
          status: true,
        },
      });

      for (const payment of stale) {
        const updated = await this.prisma.payment.updateMany({
          where: {
            id: payment.id,
            status: { in: [PaymentStatus.created, PaymentStatus.pending] },
          },
          data: {
            status: PaymentStatus.failed,
            canceledAt: new Date(),
          },
        });
        if (!updated.count) continue;

        await this.prisma.paymentLedgerEntry.create({
          data: {
            paymentId: payment.id,
            bookingId: payment.bookingId,
            entryType: 'payment_reconcile_timeout',
            amount: payment.amount,
            currency: payment.currency,
            note: `Auto-marked failed by reconciliation after ${staleMinutes}m`,
          },
        });

        await this.audit.log({
          action: AuditAction.PaymentReconcileTimeout,
          entityType: 'payment',
          entityId: payment.id,
          severity: 'warning',
          actorType: 'system',
          metadata: {
            paymentId: payment.id,
            staleMinutes,
            previousStatus: payment.status,
            createdAt: payment.createdAt.toISOString(),
          },
        });
      }

      if (stale.length) {
        this.metrics.incFeature('payment_reconcile_batch');
      }
    } catch (error) {
      this.metrics.incFeature('payment_reconcile_batch', 'error');
      const err = error as Error;
      this.logger.error(
        err.message ?? 'Payment reconciliation failed',
        err.stack,
      );
      throw error;
    } finally {
      const current = await this.redis.raw.get(lockKey);
      if (current === lockToken) {
        await this.redis.raw.del(lockKey);
      }
    }
  }
}
