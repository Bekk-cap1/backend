import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  OtpPurpose,
  OutboxStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { AdminDriversQueryDto } from './dto/admin-drivers-query.dto';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { AdminPaymentsQueryDto } from './dto/admin-payments-query.dto';
import { AdminSupportTicketsQueryDto } from './dto/admin-support-tickets-query.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AdminTripsQueryDto } from './dto/admin-trips-query.dto';
import { AdminRequestsQueryDto } from './dto/admin-requests-query.dto';
import { AdminOffersQueryDto } from './dto/admin-offers-query.dto';
import { AdminBookingsQueryDto } from './dto/admin-bookings-query.dto';
import { AdminVehiclesQueryDto } from './dto/admin-vehicles-query.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { AdminReauthDto } from './dto/admin-reauth.dto';
import { AdminReasonDto } from './dto/admin-reason.dto';
import { AdminImpersonateDto } from './dto/admin-impersonate.dto';
import { AdminUpdateTripDto } from './dto/admin-update-trip.dto';
import { AdminUpdateBookingDto } from './dto/admin-update-booking.dto';
import { AdminUpdateVehicleDto } from './dto/admin-update-vehicle.dto';
import { AdminUpdateDriverDto } from './dto/admin-update-driver.dto';
import { AdminRadarsQueryDto } from './dto/admin-radars-query.dto';
import { AdminCreateRadarDto } from './dto/admin-create-radar.dto';
import { AdminUpdateRadarDto } from './dto/admin-update-radar.dto';
import { AdminImportRadarsDto } from './dto/admin-import-radars.dto';
import {
  AdminSendNotificationDto,
  AdminSendSegmentNotificationDto,
} from './dto/admin-send-notification.dto';
import { AdminTicketAssignDto } from './dto/admin-ticket-assign.dto';
import { AdminTicketCommentDto } from './dto/admin-ticket-comment.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { AdminPaymentsReconciliationQueryDto } from './dto/admin-payments-reconciliation-query.dto';
import { UpdateSupportTicketStatusDto } from './dto/update-support-ticket-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AdminReauthService } from './admin-reauth.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
@Controller('v1/admin')
export class AdminV1Controller {
  constructor(
    private readonly admin: AdminService,
    private readonly reauth: AdminReauthService,
  ) {}

  @Get('drivers')
  listDrivers(@Query() q: AdminDriversQueryDto) {
    return this.admin.listDrivers(q);
  }

  @Get('driver-applications')
  listDriverApplications(@Query() q: AdminDriversQueryDto) {
    return this.admin.listDrivers(q);
  }

  @Get('driver-applications/:userId')
  getDriverApplicationByUserId(@Param('userId') userId: string) {
    return this.admin.getDriverApplicationByUserId(userId);
  }

  @Get('audit')
  listAudit(@Query() q: AdminAuditQueryDto) {
    return this.admin.listAudit(q);
  }

  @Post('drivers/:userId/verify')
  async verifyDriver(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.verifyDriver(userId, dto.reason);
  }

  @Post('drivers/:userId/reject')
  async rejectDriver(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.rejectDriver(userId, dto.reason);
  }

  @Get('users')
  listUsers(@Query() q: AdminUsersQueryDto) {
    return this.admin.listUsers(q);
  }

  @Get('users/:userId')
  getUserById(@Param('userId') userId: string) {
    return this.admin.getUserById(userId);
  }

  @Post('users')
  @Roles('superadmin')
  createUser(@Body() dto: AdminCreateUserDto, @CurrentUser() user: AuthUser) {
    return this.admin.createUser({
      phone: dto.phone,
      password: dto.password,
      role: dto.role,
      reason: `created by superadmin ${user.sub}`,
    });
  }

  @Patch('users/:userId')
  @Roles('superadmin')
  async updateUser(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateUserDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.updateUser(userId, {
      phone: dto.phone,
      role: dto.role,
      reason: dto.reason,
    });
  }

  @Patch('users/:userId/role')
  updateUserRole(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    if (dto.role === 'superadmin') {
      return this.requireConfirmAndExecute(user, confirmToken, dto.reason, () =>
        this.admin.updateUserRole(userId, dto.role),
      );
    }
    return this.admin.updateUserRole(userId, dto.role);
  }

  @Post('users/:userId/ban')
  banUser(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: BanUserDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    if (user.role === 'superadmin') {
      return this.requireConfirmAndExecute(user, confirmToken, dto.reason, () =>
        this.admin.banUser(userId, dto.reason),
      );
    }
    return this.admin.banUser(userId, dto.reason);
  }

  @Post('users/:userId/unban')
  unbanUser(@Param('userId') userId: string) {
    return this.admin.unbanUser(userId);
  }

  @Delete('users/:userId')
  @Roles('superadmin')
  async deleteUser(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.deleteUser(userId, dto.reason);
  }

  @Post('users/:userId/reset-password')
  @Roles('superadmin')
  async resetPassword(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: AdminResetPasswordDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.resetUserPassword({
      userId,
      reason: dto.reason,
      newPassword: dto.newPassword,
    });
  }

  @Post('users/:userId/logout-all')
  @Roles('superadmin')
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.logoutAllSessions({ userId, reason: dto.reason });
  }

  @Get('payments')
  listPayments(@Query() q: AdminPaymentsQueryDto) {
    return this.admin.listPayments(q);
  }

  @Get('payments/reconciliation')
  getPaymentsReconciliation(@Query() q: AdminPaymentsReconciliationQueryDto) {
    return this.admin.getPaymentsReconciliation(q);
  }

  @Post('payments/:paymentId/mark-paid')
  @Roles('superadmin')
  async markPaidAsSuperadmin(
    @CurrentUser() user: AuthUser,
    @Param('paymentId') paymentId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.markPaymentPaid({ paymentId, reason: dto.reason });
  }

  @Get('tickets')
  listSupportTickets(@Query() q: AdminSupportTicketsQueryDto) {
    return this.admin.listSupportTickets(q);
  }

  @Patch('tickets/:ticketId/status')
  updateSupportTicketStatus(
    @Param('ticketId') ticketId: string,
    @Body() dto: UpdateSupportTicketStatusDto,
  ) {
    return this.admin.updateSupportTicketStatus(ticketId, dto.status);
  }

  @Get('tickets/:ticketId')
  @Roles('superadmin')
  getSupportTicketById(@Param('ticketId') ticketId: string) {
    return this.admin.getSupportTicketById(ticketId);
  }

  @Post('tickets/:ticketId/comment')
  @Roles('superadmin')
  async commentTicket(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Body() dto: AdminTicketCommentDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.commentSupportTicket(ticketId, dto.comment, dto.reason);
  }

  @Post('tickets/:ticketId/assign')
  @Roles('superadmin')
  async assignTicket(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Body() dto: AdminTicketAssignDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.assignSupportTicket(ticketId, dto.adminId, dto.reason);
  }

  @Post('tickets/:ticketId/escalate')
  @Roles('superadmin')
  async escalateTicket(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.escalateSupportTicket(ticketId, dto.reason);
  }

  @Get('trips')
  @Roles('superadmin')
  listTrips(@Query() q: AdminTripsQueryDto) {
    return this.admin.listTrips({
      status: q.status,
      fromCityId: q.cityFrom,
      toCityId: q.cityTo,
      driverId: q.driverId,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      page: q.page,
      pageSize: q.pageSize,
    });
  }

  @Get('trips/:tripId')
  @Roles('superadmin')
  getTripById(@Param('tripId') tripId: string) {
    return this.admin.getTripByIdAdmin(tripId);
  }

  @Patch('trips/:tripId')
  @Roles('superadmin')
  async updateTrip(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: AdminUpdateTripDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceUpdateTrip(tripId, {
      reason: dto.reason,
      price: dto.price,
      seatsTotal: dto.seatsTotal,
      departureAt: dto.departureAt,
      fromCityId: dto.fromCityId,
      toCityId: dto.toCityId,
      vehicleId: dto.clearVehicle ? null : dto.vehicleId,
    });
  }

  @Post('trips/:tripId/publish')
  @Roles('superadmin')
  async publishTrip(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceTransitionTrip(tripId, 'publish', dto.reason);
  }

  @Post('trips/:tripId/start')
  @Roles('superadmin')
  async startTrip(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceTransitionTrip(tripId, 'start', dto.reason);
  }

  @Post('trips/:tripId/complete')
  @Roles('superadmin')
  async completeTrip(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceTransitionTrip(tripId, 'complete', dto.reason);
  }

  @Post('trips/:tripId/cancel')
  @Roles('superadmin')
  async cancelTrip(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceTransitionTrip(tripId, 'cancel', dto.reason);
  }

  @Get('requests')
  @Roles('superadmin')
  listRequests(@Query() q: AdminRequestsQueryDto) {
    return this.admin.listRequests(q);
  }

  @Get('requests/:requestId')
  @Roles('superadmin')
  getRequestById(@Param('requestId') requestId: string) {
    return this.admin.getRequestById(requestId);
  }

  @Post('requests/:requestId/cancel')
  @Roles('superadmin')
  async cancelRequest(
    @CurrentUser() user: AuthUser,
    @Param('requestId') requestId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceCancelRequest(requestId, dto.reason);
  }

  @Get('offers')
  @Roles('superadmin')
  listOffers(@Query() q: AdminOffersQueryDto) {
    return this.admin.listOffers(q);
  }

  @Get('offers/:offerId')
  @Roles('superadmin')
  getOfferById(@Param('offerId') offerId: string) {
    return this.admin.getOfferById(offerId);
  }

  @Post('offers/:offerId/accept')
  @Roles('superadmin')
  async acceptOffer(
    @CurrentUser() user: AuthUser,
    @Param('offerId') offerId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceOfferAction(offerId, 'accept', dto.reason);
  }

  @Post('offers/:offerId/reject')
  @Roles('superadmin')
  async rejectOffer(
    @CurrentUser() user: AuthUser,
    @Param('offerId') offerId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceOfferAction(offerId, 'reject', dto.reason);
  }

  @Post('offers/:offerId/cancel')
  @Roles('superadmin')
  async cancelOffer(
    @CurrentUser() user: AuthUser,
    @Param('offerId') offerId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceOfferAction(offerId, 'cancel', dto.reason);
  }

  @Get('bookings')
  @Roles('superadmin')
  listBookings(@Query() q: AdminBookingsQueryDto) {
    return this.admin.listBookings(q);
  }

  @Get('bookings/:bookingId')
  @Roles('superadmin')
  getBookingById(@Param('bookingId') bookingId: string) {
    return this.admin.getBookingById(bookingId);
  }

  @Patch('bookings/:bookingId')
  @Roles('superadmin')
  async updateBooking(
    @CurrentUser() user: AuthUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: AdminUpdateBookingDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceUpdateBooking(bookingId, dto);
  }

  @Post('bookings/:bookingId/cancel')
  @Roles('superadmin')
  async cancelBooking(
    @CurrentUser() user: AuthUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceCancelBooking(bookingId, { reason: dto.reason });
  }

  @Post('bookings/:bookingId/complete')
  @Roles('superadmin')
  async completeBooking(
    @CurrentUser() user: AuthUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceCompleteBooking(bookingId, dto.reason);
  }

  @Get('vehicles')
  @Roles('superadmin')
  listVehicles(@Query() q: AdminVehiclesQueryDto) {
    return this.admin.listVehicles(q);
  }

  @Get('vehicles/:vehicleId')
  @Roles('superadmin')
  getVehicleById(@Param('vehicleId') vehicleId: string) {
    return this.admin.getVehicleById(vehicleId);
  }

  @Patch('vehicles/:vehicleId')
  @Roles('superadmin')
  async updateVehicle(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: AdminUpdateVehicleDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceUpdateVehicle(vehicleId, dto);
  }

  @Delete('vehicles/:vehicleId')
  @Roles('superadmin')
  async deleteVehicle(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceDeleteVehicle(vehicleId, dto.reason);
  }

  @Patch('drivers/:userId')
  @Roles('superadmin')
  async updateDriver(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateDriverDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.forceUpdateDriverProfile(userId, dto);
  }

  @Get('radars')
  @Roles('superadmin')
  listRadars(@Query() q: AdminRadarsQueryDto) {
    return this.admin.listRadars(q);
  }

  @Get('radars/export')
  @Roles('superadmin')
  exportRadars() {
    return this.admin.exportRadars();
  }

  @Post('radars/import')
  @Roles('superadmin')
  async importRadars(
    @CurrentUser() user: AuthUser,
    @Body() dto: AdminImportRadarsDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.importRadars(dto.items, dto.reason);
  }

  @Post('radars')
  @Roles('superadmin')
  async createRadar(
    @CurrentUser() user: AuthUser,
    @Body() dto: AdminCreateRadarDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.createRadar(dto);
  }

  @Patch('radars/:radarId')
  @Roles('superadmin')
  async updateRadar(
    @CurrentUser() user: AuthUser,
    @Param('radarId') radarId: string,
    @Body() dto: AdminUpdateRadarDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.updateRadar(radarId, dto);
  }

  @Delete('radars/:radarId')
  @Roles('superadmin')
  async deleteRadar(
    @CurrentUser() user: AuthUser,
    @Param('radarId') radarId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.deleteRadar(radarId, dto.reason);
  }

  @Post('notifications/broadcast')
  @Roles('superadmin')
  async broadcastNotifications(
    @CurrentUser() user: AuthUser,
    @Body() dto: AdminSendNotificationDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.broadcastNotifications({
      ...dto,
      payload: dto.payload as Prisma.InputJsonValue | undefined,
    });
  }

  @Post('notifications/user/:userId')
  @Roles('superadmin')
  async notifyUser(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: AdminSendNotificationDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.sendNotificationToUser(userId, {
      ...dto,
      payload: dto.payload as Prisma.InputJsonValue | undefined,
    });
  }

  @Post('notifications/segment')
  @Roles('superadmin')
  async notifySegment(
    @CurrentUser() user: AuthUser,
    @Body() dto: AdminSendSegmentNotificationDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.sendSegmentNotifications({
      ...dto,
      payload: dto.payload as Prisma.InputJsonValue | undefined,
    });
  }

  @Get('sessions')
  @Roles('superadmin')
  listSessions(
    @Query('userId') userId?: string,
    @Query('revoked') revoked?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.listUserSessions({
      userId,
      revoked: this.toBoolean(revoked),
      page: this.toPositiveInt(page, 1),
      pageSize: this.toPositiveInt(pageSize, 50),
    });
  }

  @Get('devices')
  @Roles('superadmin')
  listDevices(
    @Query('userId') userId?: string,
    @Query('platform') platform?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.listDevices({
      userId,
      platform,
      page: this.toPositiveInt(page, 1),
      pageSize: this.toPositiveInt(pageSize, 50),
    });
  }

  @Get('payments/attempts')
  @Roles('superadmin')
  listPaymentAttempts(
    @Query('paymentId') paymentId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.listPaymentAttempts({
      paymentId,
      status: this.toPaymentStatus(status),
      page: this.toPositiveInt(page, 1),
      pageSize: this.toPositiveInt(pageSize, 50),
    });
  }

  @Get('payments/events')
  @Roles('superadmin')
  listPaymentEvents(
    @Query('paymentId') paymentId?: string,
    @Query('provider') provider?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.listPaymentEvents({
      paymentId,
      provider: this.toPaymentProvider(provider),
      page: this.toPositiveInt(page, 1),
      pageSize: this.toPositiveInt(pageSize, 50),
    });
  }

  @Get('payments/ledger')
  @Roles('superadmin')
  listPaymentLedger(
    @Query('paymentId') paymentId?: string,
    @Query('bookingId') bookingId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.listPaymentLedger({
      paymentId,
      bookingId,
      page: this.toPositiveInt(page, 1),
      pageSize: this.toPositiveInt(pageSize, 50),
    });
  }

  @Get('fare-quotes')
  @Roles('superadmin')
  listFareQuotes(
    @Query('userId') userId?: string,
    @Query('tripId') tripId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.listFareQuotes({
      userId,
      tripId,
      page: this.toPositiveInt(page, 1),
      pageSize: this.toPositiveInt(pageSize, 50),
    });
  }

  @Get('otp-codes')
  @Roles('superadmin')
  listOtpCodes(
    @Query('phone') phone?: string,
    @Query('purpose') purpose?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.listOtpCodes({
      phone,
      purpose: this.toOtpPurpose(purpose),
      page: this.toPositiveInt(page, 1),
      pageSize: this.toPositiveInt(pageSize, 50),
    });
  }

  @Get('outbox')
  @Roles('superadmin')
  listOutboxEvents(
    @Query('status') status?: string,
    @Query('topic') topic?: string,
    @Query('aggregateType') aggregateType?: string,
    @Query('aggregateId') aggregateId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.listOutboxEvents({
      status: this.toOutboxStatus(status),
      topic,
      aggregateType,
      aggregateId,
      page: this.toPositiveInt(page, 1),
      pageSize: this.toPositiveInt(pageSize, 50),
    });
  }

  @Post('outbox/:eventId/retry')
  @Roles('superadmin')
  async retryOutboxEvent(
    @CurrentUser() user: AuthUser,
    @Param('eventId') eventId: string,
    @Body() dto: AdminReasonDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.retryOutboxEvent(eventId, dto.reason);
  }

  @Get('geo/samples')
  @Roles('superadmin')
  listGeoSamples(
    @Query('tripId') tripId?: string,
    @Query('driverId') driverId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.listGeoSamples({
      tripId,
      driverId,
      page: this.toPositiveInt(page, 1),
      pageSize: this.toPositiveInt(pageSize, 100),
    });
  }

  @Post('reauth')
  @Roles('superadmin')
  async reauthAdmin(
    @CurrentUser() user: AuthUser,
    @Body() dto: AdminReauthDto,
  ) {
    return this.reauth.issueConfirmToken({
      userId: user.sub,
      password: dto.password,
    });
  }

  @Post('impersonate')
  @Roles('superadmin')
  async impersonate(
    @CurrentUser() user: AuthUser,
    @Body() dto: AdminImpersonateDto,
    @Headers('x-admin-confirm') confirmToken?: string,
  ) {
    await this.requireConfirmAndExecute(user, confirmToken, dto.reason);
    return this.admin.impersonate({
      actorUserId: user.sub,
      targetUserId: dto.userId,
      reason: dto.reason,
    });
  }

  @Post('impersonate/stop')
  @Roles('superadmin')
  stopImpersonation(@Body() dto: AdminReasonDto) {
    return this.admin.stopImpersonation({ reason: dto.reason });
  }

  @Get('system')
  @Roles('superadmin')
  getSystemSettings() {
    return this.admin.getSystemSettings();
  }

  private async requireConfirmAndExecute<T>(
    user: AuthUser,
    confirmToken: string | undefined,
    reason: string | undefined,
    fn?: () => Promise<T> | T,
  ) {
    if (!reason || reason.trim().length < 10) {
      throw new BadRequestException('Reason must be at least 10 characters');
    }
    await this.reauth.assertAndConsumeToken({ userId: user.sub, confirmToken });
    if (fn) return fn();
    return { ok: true } as T;
  }

  private toPositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? '', 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed;
  }

  private toBoolean(value: string | undefined) {
    if (!value) return undefined;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return undefined;
  }

  private toPaymentStatus(value: string | undefined) {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    return Object.values(PaymentStatus).find(
      (candidate) => candidate.toLowerCase() === normalized,
    );
  }

  private toPaymentProvider(value: string | undefined) {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    return Object.values(PaymentProvider).find(
      (candidate) => candidate.toLowerCase() === normalized,
    );
  }

  private toOtpPurpose(value: string | undefined) {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    return Object.values(OtpPurpose).find(
      (candidate) => candidate.toLowerCase() === normalized,
    );
  }

  private toOutboxStatus(value: string | undefined) {
    if (!value) return undefined;
    const normalized = value.toUpperCase();
    return Object.values(OutboxStatus).find(
      (candidate) => candidate.toUpperCase() === normalized,
    );
  }
}
