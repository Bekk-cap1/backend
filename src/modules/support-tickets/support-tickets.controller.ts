import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SupportTicketsService } from './support-tickets.service';

@Controller('support/tickets')
export class SupportTicketsController {
  constructor(private readonly tickets: SupportTicketsService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return { ok: true, data: await this.tickets.create(user.sub, dto) };
  }

  @Get('my')
  async listMine(@CurrentUser() user: AuthUser) {
    return { ok: true, data: await this.tickets.listMine(user.sub) };
  }

  @Get(':id')
  async getMineById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return { ok: true, data: await this.tickets.getMineById(user.sub, id) };
  }
}
