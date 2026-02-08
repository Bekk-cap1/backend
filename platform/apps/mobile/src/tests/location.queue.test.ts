import { describe, expect, it } from 'vitest';
import { OfflineActionQueue } from '../core/offline/action-queue';
import { shouldSendLocation } from '../core/location/location-reliability';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: async (key: string) => map.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe('location queue reliability', () => {
  it('deduplicates update_location by tripId in queue', async () => {
    const queue = new OfflineActionQueue(createMemoryStorage());

    await queue.enqueue({
      type: 'update_location',
      payload: { tripId: 'trip-1', lat: 41.3, lon: 69.2 },
    });

    await queue.enqueue({
      type: 'update_location',
      payload: { tripId: 'trip-1', lat: 41.31, lon: 69.21 },
    });

    const snapshot = await queue.snapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].payload.lat).toBe(41.31);
  });

  it('respects throttle and distance dedupe logic', () => {
    const last = {
      sentAt: 1_000,
      point: { lat: 41.3, lon: 69.2, capturedAt: 1_000 },
    };

    const tooSoonAndTooClose = shouldSendLocation(
      last,
      { lat: 41.30001, lon: 69.20001, capturedAt: 1_500 },
      { minIntervalMs: 2500, minDistanceMeters: 20 },
    );

    const farEnough = shouldSendLocation(
      last,
      { lat: 41.301, lon: 69.201, capturedAt: 1_500 },
      { minIntervalMs: 2500, minDistanceMeters: 20 },
    );

    const oldEnough = shouldSendLocation(
      last,
      { lat: 41.30001, lon: 69.20001, capturedAt: 4_000 },
      { minIntervalMs: 2500, minDistanceMeters: 20 },
    );

    expect(tooSoonAndTooClose).toBe(false);
    expect(farEnough).toBe(true);
    expect(oldEnough).toBe(true);
  });
});
