import { createContext, createElement, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { initialNegotiationState, negotiationReducer, type NegotiationAction } from './negotiation.reducer';

const NegotiationContext = createContext<{
  state: typeof initialNegotiationState;
  dispatch: Dispatch<NegotiationAction>;
} | null>(null);

export function NegotiationStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(negotiationReducer, initialNegotiationState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return createElement(NegotiationContext.Provider, { value }, children);
}

export function useNegotiationStore() {
  const ctx = useContext(NegotiationContext);
  if (!ctx) throw new Error('useNegotiationStore must be used inside provider');
  return ctx;
}
