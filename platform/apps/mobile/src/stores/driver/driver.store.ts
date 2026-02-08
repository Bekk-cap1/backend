import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from 'react';

type DriverState = {
  activeTripId: string | null;
  setActiveTripId: (id: string | null) => void;
};

const DriverContext = createContext<DriverState | null>(null);

export function DriverStoreProvider({ children }: { children: ReactNode }) {
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const value = useMemo(() => ({ activeTripId, setActiveTripId }), [activeTripId]);
  return createElement(DriverContext.Provider, { value }, children);
}

export function useDriverStore() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error('useDriverStore must be inside DriverStoreProvider');
  return ctx;
}
