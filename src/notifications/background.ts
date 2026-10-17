// Loaded first (index.js), so Android can run notification buttons with the app closed.
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { whenHydrated } from '@/store/store';
import { prepareOutbox } from '@/sync/engine';
import { handleNotificationResponse } from './actions';
import { TASK } from './constants';

if (Platform.OS !== 'web') {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(TASK, async ({ data }) => {
    if (!data || !('actionIdentifier' in data)) return Notifications.BackgroundNotificationTaskResult.NoData;
    await whenHydrated();
    await prepareOutbox();
    // Buttons that open the app are handled by the app itself once it's open.
    await handleNotificationResponse(data as unknown as Notifications.NotificationResponse);
    return Notifications.BackgroundNotificationTaskResult.NewData;
  });
  Notifications.registerTaskAsync(TASK).catch(() => {});
}
