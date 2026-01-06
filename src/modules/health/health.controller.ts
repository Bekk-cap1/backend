import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('health/live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe (Postgres + Redis)' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Postgres not ready');
    }

    const pong = await this.redis.ping();
    if (pong !== 'PONG') {
      throw new ServiceUnavailableException('Redis not ready');
    }

    return { status: 'ready' };
  }

  /**
   * @deprecated Use GET /health/live instead.
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Deprecated alias for /health/live', deprecated: true })
  health() {
    return this.live();
  }

  /**
   * @deprecated Use GET /health/ready instead.
   */
  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Deprecated alias for /health/ready', deprecated: true })
  readyAlias() {
    return this.ready();
  }
}
