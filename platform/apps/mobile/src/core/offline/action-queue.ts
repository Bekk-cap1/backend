import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const defaultStorage: StorageAdapter = {
  getItem: async (key) => AsyncStorage.getItem(key),
  setItem: async (key, value) => {
    await AsyncStorage.setItem(key, value);
  },
};

export type QueuedActionType =
  | 'create_request'
  | 'send_offer'
  | 'update_location'
  | 'create_payment_intent';

export type QueuedAction = {
  id: string;
  type: QueuedActionType;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

type ProcessResult = {
  processed: number;
  failed: number;
  remaining: number;
};

const STORAGE_KEY = 'mobile_offline_action_queue_v1';

export class OfflineActionQueue {
  private queue: QueuedAction[] = [];
  private loaded = false;

  constructor(private readonly storage: StorageAdapter = defaultStorage) {}

  async ensureLoaded() {
    if (this.loaded) return;

    const raw = await this.storage.getItem(STORAGE_KEY);
    if (!raw) {
      this.queue = [];
      this.loaded = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as QueuedAction[];
      this.queue = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.queue = [];
    }

    this.loaded = true;
  }

  async enqueue(action: Omit<QueuedAction, 'id' | 'createdAt' | 'attempts'>) {
    await this.ensureLoaded();

    const next: QueuedAction = {
      id: `${action.type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      type: action.type,
      payload: action.payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };

    if (next.type === 'update_location') {
      const tripId = String(next.payload.tripId ?? '');
      this.queue = this.queue.filter(
        (item) => !(item.type === 'update_location' && String(item.payload.tripId ?? '') === tripId),
      );
    }

    this.queue.push(next);
    await this.persist();
    return next;
  }

  async snapshot() {
    await this.ensureLoaded();
    return [...this.queue];
  }

  async clear() {
    await this.ensureLoaded();
    this.queue = [];
    await this.persist();
  }

  async process(
    handlers: Partial<Record<QueuedActionType, (payload: Record<string, unknown>) => Promise<void>>>,
    limit = 20,
  ): Promise<ProcessResult> {
    await this.ensureLoaded();

    let processed = 0;
    let failed = 0;

    const nextQueue: QueuedAction[] = [];

    for (const action of this.queue) {
      if (processed >= limit) {
        nextQueue.push(action);
        continue;
      }

      const handler = handlers[action.type];
      if (!handler) {
        nextQueue.push(action);
        continue;
      }

      try {
        await handler(action.payload);
        processed += 1;
      } catch (error) {
        failed += 1;
        nextQueue.push({
          ...action,
          attempts: action.attempts + 1,
          lastError: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }

    this.queue = nextQueue;
    await this.persist();

    return {
      processed,
      failed,
      remaining: this.queue.length,
    };
  }

  private async persist() {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
  }
}
