import { describe, expect, it, vi } from 'vitest';
import { RefreshQueue } from '../core/refresh-queue';

describe('RefreshQueue', () => {
  it('executes refresh once for concurrent requests', async () => {
    const queue = new RefreshQueue();
    const refreshFn = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return 'token-1';
    });

    const [a, b, c] = await Promise.all([
      queue.run(refreshFn),
      queue.run(refreshFn),
      queue.run(refreshFn),
    ]);

    expect(a).toBe('token-1');
    expect(b).toBe('token-1');
    expect(c).toBe('token-1');
    expect(refreshFn).toHaveBeenCalledTimes(1);
  });
});
