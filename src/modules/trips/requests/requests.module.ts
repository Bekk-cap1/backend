import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/prisma/prisma.module';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { OutboxModule } from '../../../outbox/outbox.module';

@Module({
  imports: [PrismaModule, OutboxModule],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
