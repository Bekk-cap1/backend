import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxDispatcher } from './outbox.dispatcher';

@Injectable()
export class OutboxScheduler {
  constructor(private readonly dispatcher: OutboxDispatcher) {}

  // Каждые 2 секунды — обычно ок. Можно 1s, можно 5s.
  @Cron('*/2 * * * * *')
  async tick() {
    await this.dispatcher.dispatchOnce(50, 60_000);
  }
}
