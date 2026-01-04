import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, type OnGatewayConnection, type OnGatewayDisconnect } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/realtime', cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket) {
    const userId = this.resolveUserId(client);
    if (!userId) {
      this.logger.debug(`Socket connected without userId: ${client.id}`);
      return;
    }

    client.join(this.userRoom(userId));
    this.logger.debug(`Socket connected ${client.id} user=${userId}`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.resolveUserId(client);
    if (!userId) {
      return;
    }

    this.logger.debug(`Socket disconnected ${client.id} user=${userId}`);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  private resolveUserId(client: Socket): string | undefined {
    const authUserId = client.handshake.auth?.userId;
    if (typeof authUserId === 'string' && authUserId.length > 0) {
      return authUserId;
    }

    const queryUserId = client.handshake.query?.userId;
    if (Array.isArray(queryUserId)) {
      return queryUserId[0];
    }

    if (typeof queryUserId === 'string' && queryUserId.length > 0) {
      return queryUserId;
    }

    return undefined;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}
