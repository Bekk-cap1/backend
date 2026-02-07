import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PoiController } from './poi.controller';
import { AdminPoiController } from './admin-poi.controller';
import { PoiService } from './poi.service';
import { RadarAlertService } from './radar-alert.service';

@Module({
  imports: [PrismaModule, RedisModule, RealtimeModule],
  controllers: [PoiController, AdminPoiController],
  providers: [PoiService, RadarAlertService],
  exports: [PoiService, RadarAlertService],
})
export class PoiModule {}
