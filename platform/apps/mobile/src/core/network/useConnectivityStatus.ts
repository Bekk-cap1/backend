import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export function useConnectivityStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    const readState = async () => {
      const state = await Network.getNetworkStateAsync();
      if (!mounted) return;
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    };

    readState().catch(() => undefined);

    const sub = Network.addNetworkStateListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    const timer = setInterval(() => {
      readState().catch(() => undefined);
    }, 8000);

    return () => {
      mounted = false;
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return online;
}
