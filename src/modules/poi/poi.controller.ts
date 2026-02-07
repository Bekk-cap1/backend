import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { NearbyPoiQueryDto } from './dto/nearby-poi.query.dto';
import { RoutePoiDto } from './dto/route-poi.dto';
import { CreatePoiReportDto } from './dto/create-poi-report.dto';
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

  @Post('reports')
  async report(@CurrentUser() user: AuthUser, @Body() dto: CreatePoiReportDto) {
    const data = await this.poi.createReport(user.sub, dto);
    return { ok: true, data };
  }
}
