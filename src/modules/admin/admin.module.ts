import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminV1Controller } from './admin-v1.controller';
import { DriversModule } from '../drivers/drivers.module';
import { AuditModule } from '../../audit/audit.module';
import { OutboxModule } from '../../outbox/outbox.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { AdminReauthService } from './admin-reauth.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    DriversModule,
    AuditModule,
    OutboxModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    PaymentsModule,
  ],
  controllers: [AdminController, AdminV1Controller],
  providers: [AdminService, AdminReauthService],
  exports: [AdminService, AdminReauthService],
})
export class AdminModule {}
