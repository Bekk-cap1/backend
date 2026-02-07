import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminV1Controller } from './admin-v1.controller';
import { DriversModule } from '../drivers/drivers.module';
import { AuditModule } from '../../audit/audit.module';
import { OutboxModule } from '../../outbox/outbox.module';

@Module({
  imports: [DriversModule, AuditModule, OutboxModule],
  controllers: [AdminController, AdminV1Controller],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
