import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../infrastructure/prisma/prisma.module';
import { RequestsController } from './requests.controller';
import { RequestsByIdController } from './requests-by-id.controller';
import { DriverRequestsController } from './driver-requests.controller';
import { RequestsService } from './requests.service';
import { OutboxModule } from '../../../outbox/outbox.module';
import { DriversModule } from '../../drivers/drivers.module';
import { OffersModule } from '../../offers/offers.module';

@Module({
  imports: [PrismaModule, OutboxModule, DriversModule, OffersModule],
  controllers: [RequestsController, RequestsByIdController, DriverRequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
