import { Module } from '@nestjs/common';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { OutboxService } from './outbox.service';
import { OutboxDispatcher } from './outbox.dispatcher';
import { OutboxScheduler } from './outbox.scheduler';
import { DomainEventsProcessor } from './domain-events.processor';

import { BullModule } from '@nestjs/bullmq';

const outboxProviders = [OutboxService, OutboxDispatcher, OutboxScheduler];

if (process.env.NODE_ENV !== 'test') {
  outboxProviders.push(DomainEventsProcessor);
}

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'domain-events',
    }),
  ],
  providers: outboxProviders,
  exports: [OutboxService],
})
export class OutboxModule {}
