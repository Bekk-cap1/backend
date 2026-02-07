import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { OutboxService } from '../../outbox/outbox.service';
import { OutboxTopic } from '../../outbox/outbox.topics';
import { MetricsService } from '../metrics/metrics.service';
import { PoiService } from './poi.service';

@Injectable()
export class RadarAlertService {
  constructor(
    private readonly poi: PoiService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly realtime: RealtimeGateway,
    private readonly outbox: OutboxService,
    private readonly metrics: MetricsService,
  ) {}

  async handleLocation(tripId: string, lat: number, lon: number) {
    const pois = await this.poi.nearby(lat, lon, 1500);
    if (!pois.length) return [];

    const userIds = await this.getTripParticipantIds(tripId);
    if (!userIds.length) return [];

    const emitted: string[] = [];
    for (const p of pois) {
      const dedupKey = `radar_alert:${tripId}:${p.id}`;
      const dedup = await this.redis.raw.set(dedupKey, '1', 'EX', 600, 'NX');
      if (dedup !== 'OK') continue;

      this.realtime.emitToUsers(userIds, 'trip.radar.alert', {
        tripId,
        poi: p,
      });
      await this.outbox.enqueue({
        topic: OutboxTopic.PoiRadarAlert,
        aggregateType: 'trip',
        aggregateId: tripId,
        idempotencyKey: `radar:${tripId}:${p.id}`,
        payload: {
          tripId,
          poiId: p.id,
          poiType: p.type,
          userIds,
        },
      });
      this.metrics.incFeature('radar_alert_sent');
      emitted.push(p.id);
    }
    return emitted;
  }

  private async getTripParticipantIds(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        driverId: true,
        requests: { select: { passengerId: true } },
      },
    });
    if (!trip) return [];

    const out = new Set<string>([trip.driverId]);
    for (const req of trip.requests) out.add(req.passengerId);
    return [...out];
  }
}
