import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class GeoRetentionService {
  private readonly logger = new Logger(GeoRetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
  ) {}

  @Cron(process.env.GEO_RETENTION_CRON ?? '0 3 * * *')
  async purgeOldLocationSamples() {
    if (String(process.env.GEO_RETENTION_ENABLED ?? 'true') !== 'true') return;

    const lockKey = 'locks:geo:retention';
    const lockToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const lockSec = Number(process.env.GEO_RETENTION_LOCK_SEC ?? 300);
    const acquired = await this.redis.raw.set(
      lockKey,
      lockToken,
      'EX',
      lockSec,
      'NX',
    );
    if (acquired !== 'OK') return;

    const keepDays = Number(process.env.GEO_LOCATION_RETENTION_DAYS ?? 30);
    const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);

    try {
      const deleted = await this.prisma.driverLocationSample.deleteMany({
        where: { capturedAt: { lt: cutoff } },
      });
      if (deleted.count > 0) {
        this.logger.log(
          `Geo retention removed ${deleted.count} samples older than ${keepDays} days`,
        );
        this.metrics.incFeature('geo_retention_cleanup');
      }
    } catch (error) {
      this.metrics.incFeature('geo_retention_cleanup', 'error');
      const err = error as Error;
      this.logger.error(err.message ?? 'Geo retention failed', err.stack);
      throw error;
    } finally {
      const current = await this.redis.raw.get(lockKey);
      if (current === lockToken) {
        await this.redis.raw.del(lockKey);
      }
    }
  }
}
