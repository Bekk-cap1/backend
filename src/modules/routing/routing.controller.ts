import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RouteQueryDto } from './dto/route-query.dto';
import { RoutingService } from './routing.service';

@Controller('routing')
export class RoutingController {
  constructor(private readonly routing: RoutingService) {}

  @Public()
  @Get('route')
  async route(@Query() q: RouteQueryDto) {
    const from = { lat: q.fromLat, lon: q.fromLon };
    const to = { lat: q.toLat, lon: q.toLon };

    const data = q.tripId
      ? await this.routing.routeAndStoreForTrip(q.tripId, from, to)
      : await this.routing.route(from, to);

    return { ok: true, data };
  }

  @Public()
  @Get('trip/:tripId')
  async tripRoute(@Param('tripId') tripId: string) {
    const data = await this.routing.getOrBuildTripRoute(tripId);
    return { ok: true, data };
  }

  @Public()
  @Get('trip/:tripId/eta')
  async tripEta(@Param('tripId') tripId: string) {
    const data = await this.routing.getTripEta(tripId);
    return { ok: true, data };
  }
}
