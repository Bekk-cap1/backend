import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_OUTBOX, QUEUE_PAYMENTS } from './queue.constants';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_OUTBOX) private readonly outboxQueue: Queue,
    @InjectQueue(QUEUE_PAYMENTS) private readonly paymentsQueue: Queue,
  ) {}

  addOutbox(jobName: string, data: any, opts?: any) {
    return this.outboxQueue.add(jobName, data, opts);
  }

  addPayments(jobName: string, data: any, opts?: any) {
    return this.paymentsQueue.add(jobName, data, opts);
  }
}
