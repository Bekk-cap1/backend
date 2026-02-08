export type OfferSide = 'passenger' | 'driver';

export type NegotiationOffer = {
  id: string;
  price: number;
  seats: number;
  side: OfferSide;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  createdAt: string;
  optimistic?: boolean;
};

export type NegotiationState = {
  requestId: string | null;
  turn: OfferSide | null;
  offers: NegotiationOffer[];
  status: 'idle' | 'pending' | 'accepted' | 'rejected' | 'canceled';
};

export type NegotiationAction =
  | { type: 'set-request'; payload: string }
  | {
      type: 'sync';
      payload: { offers: NegotiationOffer[]; turn: OfferSide | null; status: NegotiationState['status'] };
    }
  | { type: 'append-optimistic'; payload: NegotiationOffer }
  | { type: 'mark-final'; payload: Extract<NegotiationState['status'], 'accepted' | 'rejected' | 'canceled'> }
  | { type: 'clear' };

export const initialNegotiationState: NegotiationState = {
  requestId: null,
  turn: null,
  offers: [],
  status: 'idle',
};

export function mergeOffers(current: NegotiationOffer[], incoming: NegotiationOffer[]) {
  const byId = new Map<string, NegotiationOffer>();

  for (const offer of current) {
    byId.set(offer.id, offer);
  }

  for (const offer of incoming) {
    const prev = byId.get(offer.id);
    if (!prev || prev.optimistic) {
      byId.set(offer.id, offer);
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function negotiationReducer(state: NegotiationState, action: NegotiationAction): NegotiationState {
  switch (action.type) {
    case 'set-request':
      return { ...state, requestId: action.payload };
    case 'sync':
      return {
        ...state,
        offers: mergeOffers(state.offers, action.payload.offers),
        turn: action.payload.turn,
        status: action.payload.status,
      };
    case 'append-optimistic':
      return {
        ...state,
        offers: mergeOffers(state.offers, [action.payload]),
      };
    case 'mark-final':
      return {
        ...state,
        status: action.payload,
        turn: null,
      };
    case 'clear':
      return initialNegotiationState;
    default:
      return state;
  }
}

export function canSubmitOffer(state: NegotiationState, actor: OfferSide) {
  if (state.status === 'accepted' || state.status === 'rejected' || state.status === 'canceled') {
    return false;
  }

  if (!state.turn) {
    return true;
  }

  return state.turn === actor;
}
