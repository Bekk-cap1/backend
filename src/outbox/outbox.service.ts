import { Injectable } from '@nestjs/common';
import { OutboxStatus, type Prisma } from '@prisma/client';
import type { OutboxTopicType } from './outbox.topics';

type Tx = Prisma.TransactionClient;

export type OutboxEnqueueInput = {
  topic: OutboxTopicType;
  aggregateType: string;
  aggregateId?: string;
  payload: any;

  // если хочешь жесткую идемпотентность (рекомендуется для critical)
  idempotencyKey?: string;

  // можно откладывать доставку (например, delayed retry или scheduled)
  availableAt?: Date;
};

@Injectable()
export class OutboxService {
  async enqueueTx(tx: Tx, input: OutboxEnqueueInput) {
    // idempotencyKey опционален: если передан — гарантируем уникальность
    return tx.outboxEvent.create({
      data: {
        idempotencyKey: input.idempotencyKey ?? null,
        topic: input.topic,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId ?? null,
        payload: input.payload,
        nextRetryAt: input.availableAt ?? null,
        status: OutboxStatus.NEW,
      },
    });
  }
}
