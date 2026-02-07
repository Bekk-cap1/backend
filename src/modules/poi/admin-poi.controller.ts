import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { CreatePoiDto } from './dto/create-poi.dto';
import { UpdatePoiDto } from './dto/update-poi.dto';
import { ImportPoiDto } from './dto/import-poi.dto';
import { ListPoiReportsQueryDto } from './dto/list-poi-reports.query.dto';
import { ModeratePoiReportDto } from './dto/moderate-poi-report.dto';
import { PoiService } from './poi.service';

@Roles(Role.admin, Role.moderator)
@Controller(['admin/poi', 'v1/admin/poi'])
export class AdminPoiController {
  constructor(private readonly poi: PoiService) {}

  @Post()
  async create(@Body() dto: CreatePoiDto) {
    return { ok: true, data: await this.poi.create(dto) };
  }

  @Get()
  async list() {
    return { ok: true, data: await this.poi.listAll() };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePoiDto) {
    return { ok: true, data: await this.poi.update(id, dto) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return { ok: true, data: await this.poi.remove(id) };
  }

  @Post('import')
  async import(@Body() dto: ImportPoiDto) {
    return { ok: true, data: await this.poi.importMany(dto.items) };
  }

  @Get('reports')
  async listReports(@Query() q: ListPoiReportsQueryDto) {
    return { ok: true, data: await this.poi.listReports(q) };
  }

  @Post('reports/:id/approve')
  async approve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ModeratePoiReportDto,
  ) {
    return { ok: true, data: await this.poi.approveReport(id, user.sub, dto) };
  }

  @Post('reports/:id/reject')
  async reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ModeratePoiReportDto,
  ) {
    return { ok: true, data: await this.poi.rejectReport(id, user.sub, dto) };
  }
}
