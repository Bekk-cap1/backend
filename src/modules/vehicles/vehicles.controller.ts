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
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { ListVehiclesDto } from './dto/list-vehicles.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user';

@Controller()
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  // DRIVER: list own vehicles
  @UseGuards(JwtAuthGuard)
  @Get('vehicles')
  listMine(@CurrentUser() user: AuthUser, @Query() dto: ListVehiclesDto) {
    return this.vehicles.listMine(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('vehicles/my')
  listMineAlias(@CurrentUser() user: AuthUser, @Query() dto: ListVehiclesDto) {
    return this.vehicles.listMine(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('vehicles')
  createMine(@CurrentUser() user: AuthUser, @Body() dto: CreateVehicleDto) {
    return this.vehicles.createMine(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('vehicles/:id')
  updateMine(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehicles.updateMine(user, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('vehicles/:id')
  removeMine(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vehicles.removeMine(user, id);
  }

  // ADMIN: list all vehicles
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  @Get('admin/vehicles')
  listAll(@CurrentUser() user: AuthUser, @Query() dto: ListVehiclesDto) {
    return this.vehicles.listAll(user, dto);
  }
}
