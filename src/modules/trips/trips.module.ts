import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { DriversModule } from '../drivers/drivers.module';
import { AuditModule } from 'src/audit/audit.module';
import { OutboxModule } from 'src/outbox/outbox.module';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';

@Module({
  imports: [DriversModule, AuditModule, OutboxModule, PrismaModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
