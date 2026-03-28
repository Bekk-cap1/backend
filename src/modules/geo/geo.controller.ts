import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { GeoService } from './geo.service';
import { UpdateDriverLocationDto } from './dto/update-driver-location.dto';
import { DriverVerifiedGuard } from '../../common/guards/driver-verified.guard';
import { PlaceAutocompleteDto } from './dto/place-autocomplete.dto';
import { PlaceReverseDto } from './dto/place-reverse.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Public()
  @Get('autocomplete')
  async autocomplete(@Query() dto: PlaceAutocompleteDto) {
    const data = await this.geo.autocompletePlaces(dto);
    return { ok: true, data };
  }

  @Public()
  @Get('reverse')
  async reverse(@Query() dto: PlaceReverseDto) {
    const data = await this.geo.reverseGeocode(dto);
    return { ok: true, data };
  }

  @Patch('trips/:tripId/location')
  @UseGuards(DriverVerifiedGuard)
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
