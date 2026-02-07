import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';
import { MockRoutingProvider } from './providers/mock-routing.provider';
import { OsrmRoutingProvider } from './providers/osrm-routing.provider';

@Module({
  imports: [PrismaModule],
  controllers: [RoutingController],
  providers: [RoutingService, MockRoutingProvider, OsrmRoutingProvider],
  exports: [RoutingService],
})
export class RoutingModule {}
