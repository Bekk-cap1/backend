import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

import { CreateTripDto } from './dto/create-trip.dto';
import { PublishTripDto } from './dto/publish-trip.dto';
import { CreateTripRequestDto } from './dto/create-trip-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { SearchTripsDto } from './dto/search-trips.dto';
import { CancelTripDto } from './dto/cancel-trip.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Public()
  @Get()
  async search(@Query() dto: SearchTripsDto) {
    return this.tripsService.searchTrips(dto);
  }

  @Roles('driver')
  @Post()
  async createTrip(@CurrentUser() user: any, @Body() dto: CreateTripDto) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.createTrip(driverId, dto);
  }

  @Roles('driver')
  @Patch(':id/publish')
  async publish(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: PublishTripDto) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.publishTrip(driverId, id, dto.notes);
  }

  @Roles('passenger')
  @Post(':id/requests')
  async createRequest(
    @CurrentUser() user: any,
    @Param('id') tripId: string,
    @Body() dto: CreateTripRequestDto,
  ) {
    const passengerId = user.sub ?? user.id;
    return this.tripsService.createRequest(passengerId, tripId, dto);
  }

  @Roles('driver')
  @Get(':id/requests')
  async listRequests(@CurrentUser() user: any, @Param('id') tripId: string) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.listTripRequests(driverId, tripId);
  }

  @Roles('driver')
  @Post('requests/:requestId/accept')
  async accept(@CurrentUser() user: any, @Param('requestId') requestId: string) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.acceptRequest(driverId, requestId);
  }

  @Roles('driver')
  @Post('requests/:requestId/reject')
  async reject(
    @CurrentUser() user: any,
    @Param('requestId') requestId: string,
    @Body() dto: RejectRequestDto,
  ) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.rejectRequest(driverId, requestId, dto);
  }

  @Roles('driver')
  @Patch(':id/start')
  start(@CurrentUser() user: any, @Param('id') id: string) {
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
  @Patch(':id/cancel')
  cancel(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CancelTripDto) {
    const driverId = user.sub ?? user.id;
    return this.tripsService.cancelTrip(driverId, id, dto.reason);
  }
}
