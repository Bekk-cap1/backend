import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from '../../api/client';
import { logger } from '../logger';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushToken() {
  if (!Device.isDevice) {
    return null;
  }

  const permissions = await Notifications.getPermissionsAsync();
  const granted =
    permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    if (!requested.granted && requested.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
      return null;
    }
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse.data;

    await api.notifications.registerDevice({
      token,
      platform: Platform.OS,
      model: Device.modelName ?? undefined,
    });

    return token;
  } catch (error) {
    logger.warn('push registration failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return null;
  }
}

export function subscribePushDeepLinks(onUrl: (url: string) => void) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;

    if (typeof data.deepLink === 'string') {
      onUrl(data.deepLink);
      return;
    }

    if (typeof data.bookingId === 'string') {
      onUrl(`intercity://booking/${data.bookingId}`);
      return;
    }

    if (typeof data.tripId === 'string') {
      onUrl(`intercity://trip/${data.tripId}`);
    }
  });

  return () => subscription.remove();
}
