import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { CancellationController } from './cancellation.controller';
import { CancellationService } from './cancellation.service';

@Module({
  imports: [BookingsModule],
  controllers: [CancellationController],
  providers: [CancellationService],
  exports: [CancellationService],
})
export class CancellationModule {}
