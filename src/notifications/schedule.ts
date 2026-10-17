import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import LoopAlarm from '../../modules/loop-alarm';
import { planCheckins, type PlannedNotification } from '@/lib/checkins';
import { todayKey } from '@/lib/dates';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import { CHANNEL } from './constants';
import { ensureNotificationSetup, notificationsAllowed } from './setup';

// Planned check-ins; "-later" ones come from the Later tonight button and are left alone.
const OURS = /^(morning|afternoon|sort)-\d{4}-\d{2}-\d{2}(-r\d)?$/;
let lastFullScreen = new Set<string>();

/**
 * Rebuilds the next three days of check-ins from the current data.
 * Called after any change, so the text at 08:30 matches the tasks as they are.
 */
export async function rescheduleCheckins(): Promise<void> {
  if (Platform.OS === 'web' || !(await notificationsAllowed())) return;
  await ensureNotificationSetup();
  const { tasks, lists, inbox } = useStore.getState();
  const s = useSettings.getState();
  const now = new Date();
  const plan = planCheckins({ tasks, lists, inbox }, s, now, todayKey(now));

  // The full-screen alert replaces the morning leftovers notification when it's on and allowed.
  const fullScreen = s.fullScreen && !!LoopAlarm?.canUseFullScreenIntent();
  const isFull = (p: PlannedNotification) => fullScreen && p.kind === 'morning' && p.category === 'leftovers' && !/-r\d$/.test(p.id);

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const wanted = new Set(plan.filter((p) => !isFull(p)).map((p) => p.id));
  await Promise.all(
    scheduled.filter((n) => OURS.test(n.identifier) && !wanted.has(n.identifier)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  for (const p of plan) {
    if (isFull(p)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: p.id,
      content: { title: p.title, body: p.body, categoryIdentifier: p.category, data: { kind: p.kind, day: p.day, category: p.category } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNEL },
    });
  }

  const full = plan.filter(isFull);
  const fullIds = new Set(full.map((p) => p.id));
  for (const id of lastFullScreen) if (!fullIds.has(id)) LoopAlarm?.cancelFullScreen(id);
  for (const p of full) LoopAlarm?.scheduleFullScreen(p.id, p.at.getTime(), p.title, p.body, 'loop://checkin');
  lastFullScreen = fullIds;
}

/** After the morning check-in is answered, stop "Remind until I act" for that day. */
export async function cancelMorningReminders(day: string) {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.identifier.startsWith(`morning-${day}-r`)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}
