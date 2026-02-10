import { useEffect } from 'react';
import { Linking } from 'react-native';
import { appConfig } from '../../core/config';
import { registerPushToken, subscribePushDeepLinks } from '../../core/notifications/push';

export function useAppBootstrap() {
  useEffect(() => {
    if (!appConfig.enablePush) return;

    registerPushToken().catch(() => undefined);
    const unsubscribe = subscribePushDeepLinks((url) => {
      Linking.openURL(url).catch(() => undefined);
    });

    return unsubscribe;
  }, []);
}
