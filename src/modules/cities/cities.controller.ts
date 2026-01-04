import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { ListCitiesDto } from './dto/list-cities.dto';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller()
export class CitiesController {
  constructor(private readonly cities: CitiesService) {}

  // PUBLIC: поиск/список городов для UI
  @Get('cities')
  list(@Query() dto: ListCitiesDto) {
    return this.cities.list(dto);
  }

  @Get('cities/:id')
  get(@Param('id') id: string) {
    return this.cities.getById(id);
  }

  // ADMIN: управление справочником
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/cities')
  create(@Body() dto: CreateCityDto) {
    return this.cities.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/cities/:id')
  update(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.cities.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('admin/cities/:id')
  remove(@Param('id') id: string) {
    return this.cities.remove(id);
  }
}
