import { Injectable, Logger } from '@nestjs/common';
import { OutboxStatus } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { randomUUID } from 'node:crypto';

// Вариант А (рекомендуется): BullMQ через @nestjs/bullmq
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

@Injectable()
export class OutboxDispatcher {
  private readonly logger = new Logger(OutboxDispatcher.name);
  private readonly workerId = `outbox-dispatcher:${randomUUID()}`;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('domain-events') private readonly queue: Queue,
  ) {}

  /**
   * Параметры можно вынести в config:
   * - batchSize: сколько событий за цикл
   * - lockTtlMs: сколько держим лок прежде чем считать его “протухшим”
   */
  async dispatchOnce(batchSize = 50, lockTtlMs = 60_000) {
    const now = new Date();
    const staleBefore = new Date(Date.now() - lockTtlMs);

    // 1) Сначала “освобождаем” протухшие локи (если воркер умер)
    await this.prisma.outboxEvent.updateMany({
      where: {
        status: OutboxStatus.PROCESSING,
        lockedAt: { lt: staleBefore },
      },
      data: {
        status: OutboxStatus.NEW,
        lockedAt: null,
        lockedBy: null,
      },
    });

    // 2) Берем кандидатов
    const candidates = await this.prisma.outboxEvent.findMany({
      where: {
        status: OutboxStatus.NEW,
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
      select: {
        id: true,
        topic: true,
        payload: true,
        aggregateType: true,
        aggregateId: true,
        attempts: true,
      },
    });

    if (candidates.length === 0) return { dispatched: 0 };

    const ids = candidates.map((c) => c.id);

    // 3) Ставим лок атомарно: NEW -> PROCESSING
    const lockRes = await this.prisma.outboxEvent.updateMany({
      where: {
        id: { in: ids },
        status: 'NEW',
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      data: {
        status: OutboxStatus.PROCESSING,
        lockedAt: now,
        lockedBy: this.workerId,
      },
    });

    if (lockRes.count === 0) return { dispatched: 0 };

    // 4) Забираем реально залоченные нами (чтобы не отправить чужие)
    const locked = await this.prisma.outboxEvent.findMany({
      where: {
        id: { in: ids },
        status: OutboxStatus.PROCESSING,
        lockedBy: this.workerId,
      },
      select: {
        id: true,
        topic: true,
        payload: true,
        aggregateType: true,
        aggregateId: true,
        attempts: true,
      },
    });

    // 5) Пушим в очередь
    for (const e of locked) {
      try {
        // jobId = e.id -> гарантирует идемпотентность на уровне очереди (Bull не создаст дубликат jobId)
        await this.queue.add(
          e.topic,
          {
            outboxId: e.id,
            topic: e.topic,
            aggregateType: e.aggregateType,
            aggregateId: e.aggregateId,
            payload: e.payload,
          },
          {
            jobId: e.id,
            removeOnComplete: 10_000,
            removeOnFail: 10_000,
          },
        );

        await this.prisma.outboxEvent.update({
          where: { id: e.id },
          data: {
            status: OutboxStatus.DONE,
            sentAt: new Date(),
            lockedAt: null,
            lockedBy: null,
            lastError: null,
          },
        });
      } catch (err: unknown) {
        const attempts = (e.attempts ?? 0) + 1;

        // Exponential backoff (capped)
        const delayMs = Math.min(
          5 * 60_000,
          1_000 * 2 ** Math.min(10, attempts),
        );
        const nextRetryAt = new Date(Date.now() + delayMs);
        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : 'Unknown error';

        await this.prisma.outboxEvent.update({
          where: { id: e.id },
          data: {
            status: attempts >= 25 ? OutboxStatus.FAILED : OutboxStatus.NEW,
            attempts,
            nextRetryAt,
            lockedAt: null,
            lockedBy: null,
            lastError: errorMessage.slice(0, 1000),
          },
        });

        this.logger.warn(`Failed dispatch outbox=${e.id} attempts=${attempts}`);
      }
    }

    return { dispatched: locked.length };
  }
}
