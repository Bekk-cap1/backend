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

import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { AdminDriversQueryDto } from './dto/admin-drivers-query.dto';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { AdminPaymentsReconciliationQueryDto } from './dto/admin-payments-reconciliation-query.dto';
import { AdminPaymentsQueryDto } from './dto/admin-payments-query.dto';
import { AdminSupportTicketsQueryDto } from './dto/admin-support-tickets-query.dto';
import { RejectDriverDto } from './dto/reject-driver.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { AdminReauthDto } from './dto/admin-reauth.dto';
import { AdminReasonDto } from './dto/admin-reason.dto';
import { AdminImpersonateDto } from './dto/admin-impersonate.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { UpdateSupportTicketStatusDto } from './dto/update-support-ticket-status.dto';
import { AdminReauthService } from './admin-reauth.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly reauth: AdminReauthService,
  ) {}

  // -------- Drivers verification flow --------

  // GET /admin/drivers?status=pending&page=1&pageSize=20
  @Get('drivers')
  listDrivers(@Query() q: AdminDriversQueryDto) {
    return this.admin.listDrivers(q);
  }

  // GET /admin/audit
  @Get('audit')
  listAudit(@Query() q: AdminAuditQueryDto) {
    return this.admin.listAudit(q);
  }

  @Get('payments/reconciliation')
  getPaymentsReconciliation(@Query() q: AdminPaymentsReconciliationQueryDto) {
    return this.admin.getPaymentsReconciliation(q);
  }

  // POST /admin/drivers/:userId/verify
  @Post('drivers/:userId/verify')
  verifyDriver(@Param('userId') userId: string) {
    return this.admin.verifyDriver(userId);
  }

  // POST /admin/drivers/:userId/reject  { reason?: string }
  @Post('drivers/:userId/reject')
  rejectDriver(@Param('userId') userId: string, @Body() dto: RejectDriverDto) {
    return this.admin.rejectDriver(userId, dto.reason);
  }

  // -------- Users admin ops (roles) --------

  // PATCH /admin/users/:userId/role  { role: 'admin'|'driver'|'passenger' }
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

  @Get('payments')
  listPayments(@Query() q: AdminPaymentsQueryDto) {
    return this.admin.listPayments(q);
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

  @Post('reauth')
  @Roles('superadmin')
  reauthAdmin(@CurrentUser() user: AuthUser, @Body() dto: AdminReauthDto) {
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
}
