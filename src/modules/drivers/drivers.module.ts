import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditModule } from '../../audit/audit.module';
import { OutboxModule } from '../../outbox/outbox.module';

@Module({
  imports: [PrismaModule, AuditModule, OutboxModule],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
