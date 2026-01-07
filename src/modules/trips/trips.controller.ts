import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

import { CreateTripDto } from './dto/create-trip.dto';
import { PublishTripDto } from './dto/publish-trip.dto';
import { SearchTripsDto } from './dto/search-trips.dto';
import { CancelTripDto } from './dto/cancel-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../../common/types/auth-user';

@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Public()
  @Get()
  async search(@Query() dto: SearchTripsDto) {
    return this.tripsService.searchTrips(dto);
  }

  @Public()
  @Get('search')
  async searchAlias(@Query() dto: SearchTripsDto) {
    return this.tripsService.searchTrips(dto);
  }

  @Public()
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.tripsService.getTripById(id);
  }

  @Roles('driver')
  @Post()
  async createTrip(@CurrentUser() user: AuthUser, @Body() dto: CreateTripDto) {
    return this.tripsService.createTrip(user.sub, dto);
  }

  @Roles('driver')
  @Patch(':id')
  async updateTrip(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.updateTrip(user.sub, id, dto);
  }

  @Roles('driver')
  @Patch(':id/publish')
  async publish(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PublishTripDto,
  ) {
    return this.tripsService.publishTrip(user.sub, id, dto.notes);
  }

  @Roles('driver')
  @Post(':id/publish')
  async publishPost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PublishTripDto,
  ) {
    return this.tripsService.publishTrip(user.sub, id, dto.notes);
  }

  @Roles('driver')
  @Patch(':id/start')
  start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tripsService.startTrip(user.sub, id);
  }

  @Roles('driver')
  @Post(':id/start')
  startPost(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tripsService.startTrip(user.sub, id);
  }

  @Roles('driver')
  @Patch(':id/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tripsService.completeTrip(user.sub, id);
  }

  @Roles('driver')
  @Post(':id/complete')
  completePost(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tripsService.completeTrip(user.sub, id);
  }

  @Roles('driver')
  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelTripDto,
  ) {
    return this.tripsService.cancelTrip(user.sub, id, dto.reason);
  }

  @Roles('driver')
  @Post(':id/cancel')
  cancelPost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelTripDto,
  ) {
    return this.tripsService.cancelTrip(user.sub, id, dto.reason);
  }
}
