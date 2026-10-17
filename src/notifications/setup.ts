import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { CATEGORIES, CHANNEL, CHANNEL_QUIET } from './constants';

let ready: Promise<void> | null = null;

/** Channels and button sets. Safe to call often; runs once. */
export function ensureNotificationSetup(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  ready ??= (async () => {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Daily check-ins',
      description: 'Morning and afternoon check-ins and the Inbox reminder',
      importance: AndroidImportance.HIGH,
      lightColor: '#2F6BE3',
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_QUIET, {
      name: 'Check-in results',
      description: 'Confirmations after a check-in button, with Undo',
      importance: AndroidImportance.DEFAULT,
      sound: null,
    });
    await Promise.all(
      Object.entries(CATEGORIES).map(([id, actions]) => Notifications.setNotificationCategoryAsync(id, actions.map((a) => ({ ...a, options: { ...a.options } })))),
    );
  })();
  return ready;
}

/** Show check-ins as banners even while Loop is open. */
export function setForegroundHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export async function notificationsAllowed(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const s = await Notifications.getPermissionsAsync();
  return s.granted;
}

/** Asks Android for permission once (Milestone 6 adds the explained "Allow notifications" screen before this). */
export async function askForNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const s = await Notifications.getPermissionsAsync();
  if (s.granted) return true;
  if (!s.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}
