import { useEffect } from 'react';
import { RootNavigator } from './navigation/RootNavigator';
import { ThemeProvider } from '../ui/theme/ThemeProvider';
import { ToastProvider } from '../ui/components/Toast';
import { AuthProvider } from '../stores/auth/auth.context';
import { PassengerStoreProvider } from '../stores/passenger/passenger.store';
import { DriverStoreProvider } from '../stores/driver/driver.store';
import { TripStoreProvider } from '../stores/trip/trip.store';
import { NegotiationStoreProvider } from '../stores/negotiation/negotiation.store';
import { useConnectivityStatus } from '../core/network/useConnectivityStatus';
import { flushOfflineQueue } from '../api/critical-actions';
import { useAppBootstrap } from './bootstrap/useAppBootstrap';

function AppBoot() {
  const online = useConnectivityStatus();
  useAppBootstrap();

  useEffect(() => {
    if (!online) return;

    flushOfflineQueue().catch(() => undefined);
    const timer = setInterval(() => {
      flushOfflineQueue().catch(() => undefined);
    }, 8000);

    return () => clearInterval(timer);
  }, [online]);

  return <RootNavigator />;
}

export function AppRoot() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <PassengerStoreProvider>
            <DriverStoreProvider>
              <TripStoreProvider>
                <NegotiationStoreProvider>
                  <AppBoot />
                </NegotiationStoreProvider>
              </TripStoreProvider>
            </DriverStoreProvider>
          </PassengerStoreProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
