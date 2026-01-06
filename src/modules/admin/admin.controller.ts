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

import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { AdminDriversQueryDto } from './dto/admin-drivers-query.dto';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { RejectDriverDto } from './dto/reject-driver.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

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
  updateUserRole(@Param('userId') userId: string, @Body() dto: UpdateUserRoleDto) {
    return this.admin.updateUserRole(userId, dto.role);
  }
}
