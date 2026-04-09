import { OutboxStatus } from '@prisma/client';
import { OutboxService } from './outbox.service';
import { OutboxTopic } from './outbox.topics';

describe('OutboxService', () => {
  it('enqueues with defaults', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'evt-1' });
    const tx: { outboxEvent: { create: jest.Mock } } = {
      outboxEvent: { create },
    };

    const service = new OutboxService();
    await service.enqueueTx(tx, {
      topic: OutboxTopic.RequestCreated,
      aggregateType: 'TripRequest',
      aggregateId: 'req-1',
      payload: { hello: 'world' },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        idempotencyKey: null,
        topic: OutboxTopic.RequestCreated,
        aggregateType: 'TripRequest',
        aggregateId: 'req-1',
        payload: { hello: 'world' },
        nextRetryAt: null,
        status: 'NEW',
      },
    });
  });

  it('enqueue uses prisma directly', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'evt-3' });
    const prisma = { outboxEvent: { create } } as never;
    const service = new OutboxService(prisma);

    await service.enqueue({
      topic: OutboxTopic.TripCreated,
      aggregateType: 'trip',
      aggregateId: 'trip-1',
      payload: { x: 1 },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        idempotencyKey: null,
        topic: OutboxTopic.TripCreated,
        aggregateType: 'trip',
        aggregateId: 'trip-1',
        payload: { x: 1 },
        nextRetryAt: null,
        status: OutboxStatus.NEW,
      },
    });
  });

  it('respects idempotencyKey and availableAt', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'evt-2' });
    const tx: { outboxEvent: { create: jest.Mock } } = {
      outboxEvent: { create },
    };
    const availableAt = new Date('2030-01-01T00:00:00.000Z');

    const service = new OutboxService();
    await service.enqueueTx(tx, {
      topic: OutboxTopic.TripCreated,
      aggregateType: 'trip',
      payload: { tripId: 'trip-1' },
      idempotencyKey: 'trip:trip-1:created',
      availableAt,
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        idempotencyKey: 'trip:trip-1:created',
        topic: OutboxTopic.TripCreated,
        aggregateType: 'trip',
        aggregateId: null,
        payload: { tripId: 'trip-1' },
        nextRetryAt: availableAt,
        status: 'NEW',
      },
    });
  });
});
