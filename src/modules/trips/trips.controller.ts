import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
  async createTrip(@CurrentUser() user: any, @Body() dto: CreateTripDto) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.createTrip(driverId, dto);
  }

  @Roles('driver')
  @Patch(':id')
  async updateTrip(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateTripDto) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.updateTrip(driverId, id, dto);
  }

  @Roles('driver')
  @Patch(':id/publish')
  async publish(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: PublishTripDto) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.publishTrip(driverId, id, dto.notes);
  }

  @Roles('driver')
  @Post(':id/publish')
  async publishPost(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: PublishTripDto) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.publishTrip(driverId, id, dto.notes);
  }

  @Roles('driver')
  @Patch(':id/start')
  start(@CurrentUser() user: any, @Param('id') id: string) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.startTrip(driverId, id);
  }

  @Roles('driver')
  @Post(':id/start')
  startPost(@CurrentUser() user: any, @Param('id') id: string) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.startTrip(driverId, id);
  }

  @Roles('driver')
  @Patch(':id/complete')
  complete(@CurrentUser() user: any, @Param('id') id: string) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.completeTrip(driverId, id);
  }

  @Roles('driver')
  @Post(':id/complete')
  completePost(@CurrentUser() user: any, @Param('id') id: string) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.completeTrip(driverId, id);
  }

  @Roles('driver')
  @Patch(':id/cancel')
  cancel(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CancelTripDto) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.cancelTrip(driverId, id, dto.reason);
  }

  @Roles('driver')
  @Post(':id/cancel')
  cancelPost(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CancelTripDto) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.cancelTrip(driverId, id, dto.reason);
  }
}
