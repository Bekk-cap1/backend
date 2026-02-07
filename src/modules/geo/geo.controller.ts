import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { GeoService } from './geo.service';
import { UpdateDriverLocationDto } from './dto/update-driver-location.dto';

@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Patch('trips/:tripId/location')
  async updateTripDriverLocation(
    @Param('tripId') tripId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateDriverLocationDto,
  ) {
    const data = await this.geo.updateDriverLocationByDriver(
      user.sub,
      tripId,
      dto,
    );
    return { ok: true, data };
  }

  @Get('trips/:tripId/location')
  async getTripDriverLocation(
    @Param('tripId') tripId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.geo.getTripLastLocationForUser(
      tripId,
      user.sub,
      user.role,
    );
    return { ok: true, data };
  }

  @Get('trip/:tripId/eta')
  async getTripEta(
    @Param('tripId') tripId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.geo.getTripEtaForUser(tripId, user.sub, user.role);
    return { ok: true, data };
  }
}
