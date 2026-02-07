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
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { AdminDriversQueryDto } from './dto/admin-drivers-query.dto';
import { AdminPaymentsQueryDto } from './dto/admin-payments-query.dto';
import { AdminSupportTicketsQueryDto } from './dto/admin-support-tickets-query.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { RejectDriverDto } from './dto/reject-driver.dto';
import { UpdateSupportTicketStatusDto } from './dto/update-support-ticket-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
@Controller('v1/admin')
export class AdminV1Controller {
  constructor(private readonly admin: AdminService) {}

  @Get('drivers')
  listDrivers(@Query() q: AdminDriversQueryDto) {
    return this.admin.listDrivers(q);
  }

  @Post('drivers/:userId/verify')
  verifyDriver(@Param('userId') userId: string) {
    return this.admin.verifyDriver(userId);
  }

  @Post('drivers/:userId/reject')
  rejectDriver(@Param('userId') userId: string, @Body() dto: RejectDriverDto) {
    return this.admin.rejectDriver(userId, dto.reason);
  }

  @Get('users')
  listUsers(@Query() q: AdminUsersQueryDto) {
    return this.admin.listUsers(q);
  }

  @Patch('users/:userId/role')
  updateUserRole(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.admin.updateUserRole(userId, dto.role);
  }

  @Post('users/:userId/ban')
  banUser(@Param('userId') userId: string, @Body() dto: BanUserDto) {
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
}
