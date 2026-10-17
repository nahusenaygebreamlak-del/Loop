import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import { handleNotificationResponse, type Route } from './actions';
import { rescheduleCheckins } from './schedule';
import { askForNotifications, ensureNotificationSetup, setForegroundHandler } from './setup';

const go = (r: Route) => {
  if (r) router.navigate(r);
};

/** Keeps check-ins scheduled from the current data and routes notification taps. Mounted once, signed in. */
export function useNotifications() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    setForegroundHandler();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void rescheduleCheckins().catch((e) => console.warn('[checkins]', e)), 1500);
    };

    void (async () => {
      await ensureNotificationSetup();
      // Temporary until Milestone 6's explained "Allow notifications" step.
      await askForNotifications();
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) go(await handleNotificationResponse(last));
      soon();
    })();

    const responses = Notifications.addNotificationResponseReceivedListener((r) => void handleNotificationResponse(r).then(go));
    const unsubStore = useStore.subscribe((n, p) => {
      if (n.tasks !== p.tasks || n.inbox !== p.inbox || n.lists !== p.lists) soon();
    });
    const unsubSettings = useSettings.subscribe(soon);
    const app = AppState.addEventListener('change', (s) => s === 'active' && soon());
    return () => {
      responses.remove();
      unsubStore();
      unsubSettings();
      app.remove();
      if (timer) clearTimeout(timer);
    };
  }, []);
}
