import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  envValidationSchema,
  databaseConfig,
  redisConfig,
  jwtConfig,
  featureFlagsConfig,
  bookingsConfig,
  negotiationConfig,
} from './config';

import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { LoggerMiddleware } from './infrastructure/logger/logger.middleware';

import { UsersModule } from './modules/users/users.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AuthModule } from './modules/auth/auth.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AdminModule } from './modules/admin/admin.module';
import { CitiesModule } from './modules/cities/cities.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { TripsModule } from './modules/trips/trips.module';
import { OffersModule } from './modules/offers/offers.module';

import { AuditModule } from './audit/audit.module';

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PaymentsModule } from './modules/payments/payments.module';
import { RequestContextMiddleware } from './infrastructure/request-context/request-context.middleware';
import { RequestContextModule } from './infrastructure/request-context/request-context.module';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxModule } from './outbox/outbox.module';
import { RequestsModule } from './modules/trips/requests/requests.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { MetricsMiddleware } from './modules/metrics/metrics.middleware';
import { HealthModule } from './modules/health/health.module';
import { RoutingModule } from './modules/routing/routing.module';
import { GeoModule } from './modules/geo/geo.module';
import { PoiModule } from './modules/poi/poi.module';
import { SupportTicketsModule } from './modules/support-tickets/support-tickets.module';
import { CancellationModule } from './modules/cancellation/cancellation.module';
import { BootstrapSuperadminService } from './common/auth/bootstrap-superadmin.service';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      load: [
        databaseConfig,
        redisConfig,
        jwtConfig,
        featureFlagsConfig,
        bookingsConfig,
        negotiationConfig,
      ],
    }),

    ScheduleModule.forRoot(),

    // инфраструктура
    LoggerModule,
    PrismaModule,
    RedisModule,
    QueueModule,

    // бизнес-модули
    AuthModule,
    UsersModule,
    AccountsModule,
    DriversModule,
    VehiclesModule,
    CitiesModule,
    TripsModule,
    OffersModule,
    BookingsModule,
    RequestsModule,

    // админка / аудит
    AdminModule,
    AuditModule,
    OutboxModule,
    RequestContextModule,
    RealtimeModule,
    NotificationsModule,
    MetricsModule,
    HealthModule,
    RoutingModule,
    GeoModule,
    PoiModule,
    SupportTicketsModule,
    CancellationModule,
    StorageModule,

    PaymentsModule,
  ],

  // ВАЖНО: чтобы middleware мог получить AppLoggerService через DI
  providers: [
    LoggerMiddleware,
    RequestContextMiddleware,
    MetricsMiddleware,
    BootstrapSuperadminService,

    // глобальная защита (по умолчанию закрыто всё; Public() открывает нужное)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // логируем все http запросы
    consumer
      .apply(RequestContextMiddleware, LoggerMiddleware, MetricsMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
