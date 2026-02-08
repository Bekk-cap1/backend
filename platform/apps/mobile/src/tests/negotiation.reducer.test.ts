import { describe, expect, it } from 'vitest';
import {
  canSubmitOffer,
  initialNegotiationState,
  mergeOffers,
  negotiationReducer,
} from '../stores/negotiation/negotiation.reducer';

describe('negotiation reducer', () => {
  it('syncs offers and status', () => {
    const next = negotiationReducer(initialNegotiationState, {
      type: 'sync',
      payload: {
        offers: [
          {
            id: 'o1',
            price: 45000,
            seats: 1,
            side: 'passenger',
            status: 'pending',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        turn: 'driver',
        status: 'pending',
      },
    });

    expect(next.offers).toHaveLength(1);
    expect(next.turn).toBe('driver');
  });

  it('enforces turn based submit', () => {
    const state = {
      ...initialNegotiationState,
      status: 'pending' as const,
      turn: 'driver' as const,
    };

    expect(canSubmitOffer(state, 'passenger')).toBe(false);
    expect(canSubmitOffer(state, 'driver')).toBe(true);
  });

  it('blocks submit on final statuses', () => {
    const state = {
      ...initialNegotiationState,
      status: 'accepted' as const,
      turn: null,
    };

    expect(canSubmitOffer(state, 'passenger')).toBe(false);
  });

  it('replaces optimistic offer during sync (race-safe merge)', () => {
    const withOptimistic = negotiationReducer(initialNegotiationState, {
      type: 'append-optimistic',
      payload: {
        id: 'o-temp',
        price: 44000,
        seats: 1,
        side: 'passenger',
        status: 'pending',
        optimistic: true,
        createdAt: '2026-01-01T00:00:01.000Z',
      },
    });

    const synced = negotiationReducer(withOptimistic, {
      type: 'sync',
      payload: {
        offers: [
          {
            id: 'o-temp',
            price: 44500,
            seats: 1,
            side: 'passenger',
            status: 'pending',
            createdAt: '2026-01-01T00:00:01.000Z',
          },
        ],
        turn: 'driver',
        status: 'pending',
      },
    });

    expect(synced.offers).toHaveLength(1);
    expect(synced.offers[0].price).toBe(44500);
    expect(synced.offers[0].optimistic).toBeUndefined();
  });

  it('freezes negotiation when marked final', () => {
    const finalState = negotiationReducer(initialNegotiationState, {
      type: 'mark-final',
      payload: 'canceled',
    });

    expect(finalState.status).toBe('canceled');
    expect(finalState.turn).toBeNull();
    expect(canSubmitOffer(finalState, 'passenger')).toBe(false);
  });

  it('mergeOffers keeps deterministic ordering', () => {
    const merged = mergeOffers(
      [
        {
          id: 'o2',
          price: 46000,
          seats: 1,
          side: 'driver',
          status: 'pending',
          createdAt: '2026-01-01T00:00:02.000Z',
        },
      ],
      [
        {
          id: 'o1',
          price: 45000,
          seats: 1,
          side: 'passenger',
          status: 'pending',
          createdAt: '2026-01-01T00:00:01.000Z',
        },
      ],
    );

    expect(merged.map((item) => item.id)).toEqual(['o1', 'o2']);
  });
});
