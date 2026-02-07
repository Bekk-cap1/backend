import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreatePoiDto } from './dto/create-poi.dto';
import { UpdatePoiDto } from './dto/update-poi.dto';
import { PoiService } from './poi.service';

@Roles(Role.admin, Role.moderator)
@Controller('admin/poi')
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
}
