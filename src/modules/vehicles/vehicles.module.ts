import { Module } from '@nestjs/common';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { DriverVerifiedGuard } from '../../common/guards/driver-verified.guard';

@Module({
  controllers: [VehiclesController],
  providers: [VehiclesService, DriverVerifiedGuard],
})
export class VehiclesModule {}
