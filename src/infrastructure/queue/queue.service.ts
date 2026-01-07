import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { JobsOptions } from 'bullmq';
import { QUEUE_OUTBOX, QUEUE_PAYMENTS } from './queue.constants';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_OUTBOX)
    private readonly outboxQueue: Queue<unknown, unknown>,
    @InjectQueue(QUEUE_PAYMENTS)
    private readonly paymentsQueue: Queue<unknown, unknown>,
  ) {}

  addOutbox<TData>(jobName: string, data: TData, opts?: JobsOptions) {
    return this.outboxQueue.add(jobName, data, opts);
  }

  addPayments<TData>(jobName: string, data: TData, opts?: JobsOptions) {
    return this.paymentsQueue.add(jobName, data, opts);
  }
}
