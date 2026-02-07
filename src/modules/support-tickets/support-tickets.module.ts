import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { OutboxModule } from '../../outbox/outbox.module';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicketsService } from './support-tickets.service';

@Module({
  imports: [PrismaModule, OutboxModule],
  controllers: [SupportTicketsController],
  providers: [SupportTicketsService],
})
export class SupportTicketsModule {}
