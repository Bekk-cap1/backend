import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from 'react';

type PassengerState = {
  selectedTripId: string | null;
  setSelectedTripId: (id: string | null) => void;
};

const PassengerContext = createContext<PassengerState | null>(null);

export function PassengerStoreProvider({ children }: { children: ReactNode }) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const value = useMemo(() => ({ selectedTripId, setSelectedTripId }), [selectedTripId]);
  return createElement(PassengerContext.Provider, { value }, children);
}

export function usePassengerStore() {
  const ctx = useContext(PassengerContext);
  if (!ctx) throw new Error('usePassengerStore must be inside PassengerStoreProvider');
  return ctx;
}
