import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from 'react';

type TripState = {
  activeTripId: string | null;
  currentBookingId: string | null;
  setActiveTripId: (id: string | null) => void;
  setCurrentBookingId: (id: string | null) => void;
};

const TripContext = createContext<TripState | null>(null);

export function TripStoreProvider({ children }: { children: ReactNode }) {
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);

  const value = useMemo(
    () => ({ activeTripId, currentBookingId, setActiveTripId, setCurrentBookingId }),
    [activeTripId, currentBookingId],
  );

  return createElement(TripContext.Provider, { value }, children);
}

export function useTripStore() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTripStore must be inside TripStoreProvider');
  return ctx;
}
