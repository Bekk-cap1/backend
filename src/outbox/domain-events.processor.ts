import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { OutboxTopic, type OutboxTopicType } from './outbox.topics';
import { ConfigService } from '@nestjs/config';
import { RealtimeGateway } from '../modules/realtime/realtime.gateway';

type NotificationDraft = {
  userId: string;
  type: OutboxTopicType;
  title: string;
  message?: string | null;
  payload?: Record<string, unknown> | null;
  idempotencyKey: string;
};

@Processor('domain-events')
export class DomainEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(DomainEventsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {
    super();
  }

  async process(job: Job) {
    // job.name == topic
    // job.data == payload
    this.logger.log(`EVENT ${job.name} outboxId=${job.data?.outboxId}`);

    const topic = job.name as OutboxTopicType;
    const payload = (job.data?.payload ?? {}) as Record<string, unknown>;
    const outboxId = String(job.data?.outboxId ?? '');

    const notifications = await this.buildNotifications(topic, payload, outboxId);
    if (notifications.length === 0) {
      return;
    }

    const realtimeEnabled = Boolean(this.config.get('features.realtimeEnabled'));

    for (const notification of notifications) {
      const created = await this.createNotification(notification);
      if (created && realtimeEnabled) {
        this.realtimeGateway.emitToUser(created.userId, 'notification', created);
      }
    }
  }

  private async createNotification(notification: NotificationDraft) {
    try {
      return await this.prisma.notification.create({
        data: {
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message ?? null,
          payload: notification.payload ?? null,
          idempotencyKey: notification.idempotencyKey,
        },
      });
    } catch (error: any) {
      if (String(error?.code) === 'P2002') {
        return null;
      }
      throw error;
    }
  }

  private async buildNotifications(
    topic: OutboxTopicType,
    payload: Record<string, unknown>,
    outboxId: string,
  ): Promise<NotificationDraft[]> {
    switch (topic) {
      case OutboxTopic.TripPublished:
        return this.notifyTripPublished(payload, outboxId);
      case OutboxTopic.TripStarted:
        return this.notifyTripParticipants(payload, outboxId, topic, 'Поездка началась', 'Водитель начал поездку.');
      case OutboxTopic.TripCompleted:
        return this.notifyTripParticipants(payload, outboxId, topic, 'Поездка завершена', 'Поездка завершена. Спасибо!');
      case OutboxTopic.TripCanceled:
        return this.notifyTripParticipants(payload, outboxId, topic, 'Поездка отменена', 'Поездка была отменена.');
      case OutboxTopic.RequestCreated:
        return this.notifyRequestCreated(payload, outboxId);
      case OutboxTopic.RequestAccepted:
        return this.notifyRequestDecision(payload, outboxId, topic, 'Заявка принята', 'Ваша заявка принята.');
      case OutboxTopic.RequestRejected:
        return this.notifyRequestDecision(payload, outboxId, topic, 'Заявка отклонена', 'Ваша заявка отклонена.');
      case OutboxTopic.RequestCanceled:
        return this.notifyRequestCanceled(payload, outboxId);
      case OutboxTopic.OfferCreated:
        return this.notifyOfferCreated(payload, outboxId);
      case OutboxTopic.OfferAccepted:
        return this.notifyOfferOutcome(payload, outboxId, topic, 'Оффер принят', 'Ваш оффер принят.');
      case OutboxTopic.OfferRejected:
        return this.notifyOfferOutcome(payload, outboxId, topic, 'Оффер отклонен', 'Ваш оффер отклонен.');
      case OutboxTopic.OfferCanceled:
        return this.notifyOfferOutcome(payload, outboxId, topic, 'Оффер отменен', 'Оффер был отменен.');
      case OutboxTopic.DriverVerified:
        return this.notifyUser(payload, outboxId, topic, 'Профиль водителя подтвержден', 'Ваш профиль водителя подтвержден.');
      case OutboxTopic.DriverRejected:
        return this.notifyUser(payload, outboxId, topic, 'Профиль водителя отклонен', 'Ваш профиль водителя отклонен.');
      case OutboxTopic.UserRoleChanged:
        return this.notifyUser(payload, outboxId, topic, 'Роль обновлена', 'Ваша роль была изменена.');
      default:
        return [];
    }
  }

  private async notifyTripPublished(payload: Record<string, unknown>, outboxId: string) {
    const driverId = String(payload.driverId ?? '');
    if (!driverId) return [];

    return [
      this.buildNotification({
        userId: driverId,
        type: OutboxTopic.TripPublished,
        title: 'Поездка опубликована',
        message: 'Ваша поездка опубликована и доступна пассажирам.',
        payload,
        outboxId,
      }),
    ];
  }

  private async notifyTripParticipants(
    payload: Record<string, unknown>,
    outboxId: string,
    type: OutboxTopicType,
    title: string,
    message: string,
  ) {
    const tripId = String(payload.tripId ?? '');
    if (!tripId) return [];

    const bookings = await this.prisma.booking.findMany({
      where: { tripId },
      select: { passengerId: true },
    });

    return bookings.map((booking) =>
      this.buildNotification({
        userId: booking.passengerId,
        type,
        title,
        message,
        payload,
        outboxId,
      }),
    );
  }

  private async notifyRequestCreated(payload: Record<string, unknown>, outboxId: string) {
    const tripId = String(payload.tripId ?? '');
    if (!tripId) return [];

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { driverId: true },
    });

    if (!trip) return [];

    return [
      this.buildNotification({
        userId: trip.driverId,
        type: OutboxTopic.RequestCreated,
        title: 'Новая заявка',
        message: 'Поступила новая заявка на поездку.',
        payload,
        outboxId,
      }),
    ];
  }

  private async notifyRequestDecision(
    payload: Record<string, unknown>,
    outboxId: string,
    type: OutboxTopicType,
    title: string,
    message: string,
  ) {
    const requestId = String(payload.requestId ?? '');
    if (!requestId) return [];

    const request = await this.prisma.tripRequest.findUnique({
      where: { id: requestId },
      select: { passengerId: true },
    });
    if (!request) return [];

    return [
      this.buildNotification({
        userId: request.passengerId,
        type,
        title,
        message,
        payload,
        outboxId,
      }),
    ];
  }

  private async notifyRequestCanceled(payload: Record<string, unknown>, outboxId: string) {
    const requestId = String(payload.requestId ?? '');
    if (!requestId) return [];

    const request = await this.prisma.tripRequest.findUnique({
      where: { id: requestId },
      include: { trip: { select: { driverId: true } } },
    });
    if (!request) return [];

    return [
      this.buildNotification({
        userId: request.trip.driverId,
        type: OutboxTopic.RequestCanceled,
        title: 'Заявка отменена',
        message: 'Пассажир отменил заявку на поездку.',
        payload,
        outboxId,
      }),
    ];
  }

  private async notifyOfferCreated(payload: Record<string, unknown>, outboxId: string) {
    const requestId = String(payload.requestId ?? '');
    const proposerId = String(payload.proposerId ?? '');
    const proposerRole = String(payload.proposerRole ?? '');
    if (!requestId || !proposerId) return [];

    const request = await this.prisma.tripRequest.findUnique({
      where: { id: requestId },
      include: { trip: { select: { driverId: true } } },
    });
    if (!request) return [];

    const recipientId = proposerRole === 'passenger' ? request.trip.driverId : request.passengerId;
    if (!recipientId) return [];

    return [
      this.buildNotification({
        userId: recipientId,
        type: OutboxTopic.OfferCreated,
        title: 'Новый оффер',
        message: 'Поступил новый оффер по заявке.',
        payload,
        outboxId,
      }),
    ];
  }

  private async notifyOfferOutcome(
    payload: Record<string, unknown>,
    outboxId: string,
    type: OutboxTopicType,
    title: string,
    message: string,
  ) {
    const proposerId = String(payload.proposerId ?? '');
    if (!proposerId) return [];

    return [
      this.buildNotification({
        userId: proposerId,
        type,
        title,
        message,
        payload,
        outboxId,
      }),
    ];
  }

  private async notifyUser(
    payload: Record<string, unknown>,
    outboxId: string,
    type: OutboxTopicType,
    title: string,
    message: string,
  ) {
    const userId = String(payload.userId ?? '');
    if (!userId) return [];

    return [
      this.buildNotification({
        userId,
        type,
        title,
        message,
        payload,
        outboxId,
      }),
    ];
  }

  private buildNotification(input: {
    userId: string;
    type: OutboxTopicType;
    title: string;
    message?: string | null;
    payload?: Record<string, unknown> | null;
    outboxId: string;
  }): NotificationDraft {
    return {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      payload: input.payload ?? null,
      idempotencyKey: `outbox:${input.outboxId}:user:${input.userId}`,
    };
  }
}
