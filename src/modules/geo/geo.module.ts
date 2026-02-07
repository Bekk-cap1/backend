import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RoutingModule } from '../routing/routing.module';
import { PoiModule } from '../poi/poi.module';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { GeoGateway } from './geo.gateway';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    RealtimeModule,
    RoutingModule,
    PoiModule,
  ],
  controllers: [GeoController],
  providers: [GeoService, GeoGateway],
  exports: [GeoService],
})
export class GeoModule {}
