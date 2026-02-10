import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CitiesService } from './cities.service';
import { ListCitiesDto } from './dto/list-cities.dto';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { SuggestCityDto } from './dto/suggest-city.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller()
export class CitiesController {
  constructor(private readonly cities: CitiesService) {}

  // PUBLIC: поиск/список городов для UI
  @Public()
  @Get('cities')
  list(@Query() dto: ListCitiesDto) {
    return this.cities.list(dto);
  }

  @Public()
  @Get('cities/:id')
  get(@Param('id') id: string) {
    return this.cities.getById(id);
  }

  // ADMIN: управление справочником
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Get('admin/cities')
  listAdmin(@Query() dto: ListCitiesDto) {
    return this.cities.list({ ...dto, includeInactive: true });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Get('v1/admin/cities')
  listAdminV1(@Query() dto: ListCitiesDto) {
    return this.cities.list({ ...dto, includeInactive: true });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Get('admin/cities/suggest')
  suggest(@Query() dto: SuggestCityDto) {
    return this.cities.suggest(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Get('v1/admin/cities/suggest')
  suggestV1(@Query() dto: SuggestCityDto) {
    return this.cities.suggest(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Post('admin/cities')
  create(@Body() dto: CreateCityDto) {
    return this.cities.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Post('v1/admin/cities')
  createV1(@Body() dto: CreateCityDto) {
    return this.cities.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Patch('admin/cities/:id')
  update(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.cities.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Patch('v1/admin/cities/:id')
  updateV1(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.cities.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Patch('admin/cities/:id/toggle')
  toggle(
    @Param('id') id: string,
    @Body() dto: { isActive?: boolean },
  ) {
    return this.cities.toggle(id, dto?.isActive);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Patch('v1/admin/cities/:id/toggle')
  toggleV1(
    @Param('id') id: string,
    @Body() dto: { isActive?: boolean },
  ) {
    return this.cities.toggle(id, dto?.isActive);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Delete('admin/cities/:id')
  remove(@Param('id') id: string) {
    return this.cities.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Delete('v1/admin/cities/:id')
  removeV1(@Param('id') id: string) {
    return this.cities.remove(id);
  }
}
