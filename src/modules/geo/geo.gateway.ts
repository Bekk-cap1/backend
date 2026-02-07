import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { GeoService } from './geo.service';
import { WsDriverLocationDto } from './dto/ws-driver-location.dto';
import { isRecord } from '../../common/utils/type-guards';

@WebSocketGateway({ namespace: '/ws', cors: { origin: '*' } })
export class GeoGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly geo: GeoService) {}

  handleConnection(client: Socket) {
    const userId = this.resolveUserId(client);
    if (!userId) return;
    void client.join(`user:${userId}`);
  }

  @SubscribeMessage('driver.location.update')
  async handleLocationUpdate(
    @MessageBody() body: WsDriverLocationDto,
    client: Socket,
  ) {
    const userId = this.resolveUserId(client);
    if (!userId) {
      return { ok: false, error: 'Unauthorized' };
    }

    const data = await this.geo.updateDriverLocationByDriver(
      userId,
      body.tripId,
      {
        lat: body.lat,
        lon: body.lon,
        speedKmh: body.speedKmh,
        headingDeg: body.headingDeg,
      },
    );
    return { ok: true, data };
  }

  private resolveUserId(client: Socket): string | undefined {
    const auth = client.handshake.auth;
    if (isRecord(auth)) {
      const authUserId = auth.userId;
      if (typeof authUserId === 'string' && authUserId.length > 0) {
        return authUserId;
      }
    }

    const queryUserId = client.handshake.query?.userId;
    if (Array.isArray(queryUserId)) return queryUserId[0];
    if (typeof queryUserId === 'string' && queryUserId.length > 0) {
      return queryUserId;
    }

    return undefined;
  }
}
