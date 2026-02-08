import { normalizeApiError } from '@platform/api-client';
import { api } from './client';
import { OfflineActionQueue } from '../core/offline/action-queue';
import { normalizeLocationPoint, type LocationPoint } from '../core/location/foreground';

const queue = new OfflineActionQueue();

function isNetworkFailure(error: unknown) {
  return normalizeApiError(error).type === 'network';
}

export async function createRequestWithQueue(params: {
  tripId: string;
  seats: number;
  price: number;
  currency: string;
  message?: string;
}) {
  try {
    return {
      queued: false,
      result: await api.trips.createRequest(params.tripId, {
        seats: params.seats,
        price: params.price,
        currency: params.currency,
        message: params.message,
      }),
    };
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;

    await queue.enqueue({
      type: 'create_request',
      payload: params,
    });

    return { queued: true, result: null };
  }
}

export async function sendOfferWithQueue(params: {
  requestId: string;
  price: number;
  seats: number;
  currency: string;
  message?: string;
}) {
  try {
    return {
      queued: false,
      result: await api.requests.createOffer(params.requestId, {
        price: params.price,
        seats: params.seats,
        currency: params.currency,
        message: params.message,
      }),
    };
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;

    await queue.enqueue({
      type: 'send_offer',
      payload: params,
    });

    return { queued: true, result: null };
  }
}

export async function createPaymentIntentWithQueue(params: {
  bookingId: string;
  provider: string;
  idempotencyKey?: string;
}) {
  try {
    return {
      queued: false,
      result: await api.payments.createIntent(params.bookingId, {
        provider: params.provider,
        idempotencyKey: params.idempotencyKey,
      }),
    };
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;

    await queue.enqueue({
      type: 'create_payment_intent',
      payload: params,
    });

    return { queued: true, result: null };
  }
}

export async function sendLocationWithQueue(params: {
  tripId: string;
  point: LocationPoint;
}) {
  const payload = {
    tripId: params.tripId,
    ...normalizeLocationPoint(params.point),
  };

  try {
    return {
      queued: false,
      result: await api.geo.updateDriverLocation(params.tripId, payload),
    };
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;

    await queue.enqueue({
      type: 'update_location',
      payload,
    });

    return { queued: true, result: null };
  }
}

export async function flushOfflineQueue() {
  return queue.process(
    {
      create_request: async (payload) => {
        await api.trips.createRequest(String(payload.tripId), payload);
      },
      send_offer: async (payload) => {
        await api.requests.createOffer(String(payload.requestId), payload);
      },
      create_payment_intent: async (payload) => {
        await api.payments.createIntent(String(payload.bookingId), payload);
      },
      update_location: async (payload) => {
        await api.geo.updateDriverLocation(String(payload.tripId), {
          lat: Number(payload.lat),
          lon: Number(payload.lon),
          speedKmh:
            typeof payload.speedKmh === 'number' ? Number(payload.speedKmh) : undefined,
          headingDeg:
            typeof payload.headingDeg === 'number' ? Number(payload.headingDeg) : undefined,
        });
      },
    },
    50,
  );
}

export async function getOfflineQueueSize() {
  const items = await queue.snapshot();
  return items.length;
}
