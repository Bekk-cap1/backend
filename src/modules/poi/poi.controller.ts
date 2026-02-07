import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { NearbyPoiQueryDto } from './dto/nearby-poi.query.dto';
import { RoutePoiDto } from './dto/route-poi.dto';
import { PoiService } from './poi.service';

@Controller('poi')
export class PoiController {
  constructor(private readonly poi: PoiService) {}

  @Public()
  @Get('nearby')
  async nearby(@Query() q: NearbyPoiQueryDto) {
    const data = await this.poi.nearby(
      q.lat,
      q.lon,
      q.radiusMeters ?? 1200,
      q.type,
    );
    return { ok: true, data };
  }

  @Public()
  @Post('route')
  async route(@Body() dto: RoutePoiDto) {
    const data = await this.poi.alongRoute(
      dto.polyline,
      dto.bufferMeters,
      dto.type,
    );
    return { ok: true, data };
  }
}
