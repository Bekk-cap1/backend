import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PoiService } from './poi.service';

@Injectable()
export class RadarAlertService {
  constructor(
    private readonly poi: PoiService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly realtime: RealtimeGateway,
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
