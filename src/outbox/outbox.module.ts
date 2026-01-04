import { Module } from '@nestjs/common';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { OutboxService } from './outbox.service';
import { OutboxDispatcher } from './outbox.dispatcher';
import { OutboxScheduler } from './outbox.scheduler';
import { DomainEventsProcessor } from './domain-events.processor';
import { RealtimeModule } from '../modules/realtime/realtime.module';

import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    BullModule.registerQueue({
      name: 'domain-events',
    }),
  ],
  providers: [
    OutboxService,
    OutboxDispatcher,
    OutboxScheduler,
    DomainEventsProcessor,
  ],
  exports: [OutboxService],
})
export class OutboxModule {}
