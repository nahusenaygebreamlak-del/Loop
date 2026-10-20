import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import LoopAlarm from '../../modules/loop-alarm';
import { planCheckins, type PlannedNotification } from '@/lib/checkins';
import { todayKey } from '@/lib/dates';
import { planTaskReminders } from '@/lib/reminders';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import { CHANNEL } from './constants';
import { ensureNotificationSetup, notificationsAllowed } from './setup';

// Planned check-ins; "-later" ones come from the Later tonight button and are left alone.
const OURS = /^(morning|afternoon|sort)-\d{4}-\d{2}-\d{2}(-r\d)?$/;
const TASK_REMINDER = /^task-/;
// Alerts set through Loop's own Android module (they survive app restarts, so remember their ids).
const NATIVE_KEY = 'loop.nativeAlerts.v1';

/**
 * Rebuilds the next three days of check-ins and task reminders from the current data.
 * Called after any change, so the text at 08:30 matches the tasks as they are.
 *
 * On Android, task reminders and the full-screen morning check-in go through Loop's alarm
 * module: sound, vibration, a lit screen, and full screen over the lock screen when turned on.
 * Check-ins with buttons stay Expo notifications, plus a native wake-up at the same moment.
 */
export async function rescheduleCheckins(): Promise<void> {
  if (Platform.OS === 'web' || !(await notificationsAllowed())) return;
  await ensureNotificationSetup();
  const { tasks, lists, inbox } = useStore.getState();
  const s = useSettings.getState();
  const now = new Date();
  const plan = planCheckins({ tasks, lists, inbox }, s, now, todayKey(now));
  const native = !!LoopAlarm;

  const fullScreen = s.fullScreen && !!LoopAlarm?.canUseFullScreenIntent();
  // The full-screen alert replaces the morning leftovers notification when it's on and allowed.
  const isFull = (p: PlannedNotification) => fullScreen && p.kind === 'morning' && p.category === 'leftovers' && !/-r\d$/.test(p.id);

  const reminders = planTaskReminders(tasks, lists, now, todayKey(now));
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const wantedExpo = new Set([...plan.filter((p) => !isFull(p)).map((p) => p.id), ...(native ? [] : reminders.map((r) => r.id))]);
  await Promise.all(
    scheduled
      .filter((n) => (OURS.test(n.identifier) || TASK_REMINDER.test(n.identifier)) && !wantedExpo.has(n.identifier))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  for (const p of plan) {
    if (isFull(p)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: p.id,
      content: { title: p.title, body: p.body, categoryIdentifier: p.category, data: { kind: p.kind, day: p.day, category: p.category } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNEL, delivery: 'alarmClock' },
    });
  }

  if (!native) {
    for (const r of reminders) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, data: { kind: 'task', taskId: r.taskId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL, delivery: 'alarmClock' },
      });
    }
    return;
  }

  // Native alerts: reminders, the full-screen check-in, and wake-ups for the other check-ins.
  const alerts: { id: string; at: number; title: string; body: string; url: string; full: boolean; wakeOnly: boolean }[] = [
    ...reminders.map((r) => ({ id: r.id, at: r.at.getTime(), title: r.title, body: r.body, url: `loop://alert/${r.taskId}`, full: fullScreen, wakeOnly: false })),
    ...plan.map((p) => ({ id: isFull(p) ? p.id : `wake-${p.id}`, at: p.at.getTime(), title: p.title, body: p.body, url: 'loop://checkin', full: isFull(p), wakeOnly: !isFull(p) })),
  ];
  const before: string[] = JSON.parse((await AsyncStorage.getItem(NATIVE_KEY)) ?? '[]');
  const now_ = new Set(alerts.map((a) => a.id));
  for (const id of before) if (!now_.has(id)) LoopAlarm!.cancelAlert(id);
  for (const a of alerts) LoopAlarm!.scheduleAlert(a.id, a.at, a.title, a.body, a.url, a.full, a.wakeOnly);
  await AsyncStorage.setItem(NATIVE_KEY, JSON.stringify([...now_]));
}

/** Snooze from the full-screen reminder: the same alert again in `minutes`. */
export function snoozeAlert(taskId: string, title: string, minutes: number) {
  if (!LoopAlarm) return;
  const s = useSettings.getState();
  const full = s.fullScreen && LoopAlarm.canUseFullScreenIntent();
  LoopAlarm.scheduleAlert(`snooze-${taskId}`, Date.now() + minutes * 60_000, title, `Snoozed ${minutes} min`, `loop://alert/${taskId}`, full, false);
}

/** After the morning check-in is answered, stop "Remind until I act" for that day. */
export async function cancelMorningReminders(day: string) {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.identifier.startsWith(`morning-${day}-r`)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}
