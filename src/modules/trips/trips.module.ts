import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { DriversModule } from '../drivers/drivers.module';
import { AuditModule } from '../../audit/audit.module';
import { OutboxModule } from '../../outbox/outbox.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [DriversModule, AuditModule, OutboxModule, PrismaModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
