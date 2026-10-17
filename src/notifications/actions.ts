import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { applyChoices, leftovers, type Change, type Choice } from '@/lib/checkins';
import { addDays, todayKey } from '@/lib/dates';
import { isOpen, visibleTasks } from '@/lib/taskViews';
import { useStore } from '@/store/store';
import { A, CHANNEL_QUIET } from './constants';
import { cancelMorningReminders, rescheduleCheckins } from './schedule';

export type Route = '/' | '/checkin' | '/inbox/sort' | null;

const HANDLED = 'loop.notification-responses';
const seen = new Set<string>();
async function firstTime(key: string): Promise<boolean> {
  if (seen.has(key)) return false;
  seen.add(key);
  const list: string[] = JSON.parse((await AsyncStorage.getItem(HANDLED)) ?? '[]');
  if (list.includes(key)) return false;
  await AsyncStorage.setItem(HANDLED, JSON.stringify([key, ...list].slice(0, 30)));
  return true;
}

const plural = (n: number) => `${n} task${n === 1 ? '' : 's'}`;

/** Replaces the check-in notification with its result (NNotifActed), keeping the old values for Undo. */
async function showResult(identifier: string, title: string, prev: Change[]) {
  const today = todayKey();
  const { tasks, lists } = useStore.getState();
  const open = visibleTasks(tasks, lists).filter((t) => isOpen(t) && t.dueDate === today).length;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body: `Today now has ${plural(open)}.`,
      categoryIdentifier: 'acted',
      data: { category: 'acted', undo: JSON.stringify(prev) },
    },
    trigger: { channelId: CHANNEL_QUIET },
  });
}

/**
 * Handles a tap or a button on a check-in notification.
 * Works with the app closed (Android runs it in the background); returns where to go when the app opens.
 */
export async function handleNotificationResponse(response: Notifications.NotificationResponse): Promise<Route> {
  const { actionIdentifier, notification } = response;
  // The background task and the in-app listener can both see one press; act once.
  if (!(await firstTime(`${notification.request.identifier}|${actionIdentifier}|${notification.date}`))) return null;
  const id = notification.request.identifier;
  const data = (notification.request.content.data ?? {}) as { category?: string; day?: string; undo?: string };
  const today = todayKey();
  const store = useStore.getState();
  const now = new Date().toISOString();

  const act = async (choices: Record<string, Choice>, title: (n: number) => string) => {
    if (!Object.keys(choices).length) {
      await Notifications.dismissNotificationAsync(id);
      return;
    }
    const { next, prev } = applyChoices(useStore.getState().tasks, choices, today, now);
    store.applyCheckin(next);
    await showResult(id, title(next.length), prev);
    if (data.day) await cancelMorningReminders(data.day);
    await rescheduleCheckins();
  };

  switch (actionIdentifier) {
    case A.moveToday: {
      const left = leftovers(store.tasks, store.lists, today);
      await act(Object.fromEntries(left.map((t) => [t.id, 'today' as const])), (n) => `Moved ${plural(n)} to today`);
      return null;
    }
    case A.allDone: {
      const left = leftovers(store.tasks, store.lists, today);
      await act(Object.fromEntries(left.map((t) => [t.id, 'done' as const])), (n) => `Marked ${plural(n)} done`);
      return null;
    }
    case A.moveTomorrow: {
      const open = visibleTasks(store.tasks, store.lists).filter((t) => isOpen(t) && t.dueDate === today);
      await act(Object.fromEntries(open.map((t) => [t.id, { date: addDays(today, 1) }])), (n) => `Moved ${plural(n)} to tomorrow`);
      return null;
    }
    case A.undo: {
      if (data.undo) store.applyCheckin(JSON.parse(data.undo) as Change[]);
      await Notifications.dismissNotificationAsync(id);
      await rescheduleCheckins();
      return null;
    }
    case A.notToday:
      await Notifications.dismissNotificationAsync(id);
      return null;
    case A.review:
      await Notifications.dismissNotificationAsync(id);
      return '/checkin';
    case A.sortNow:
      await Notifications.dismissNotificationAsync(id);
      return '/inbox/sort';
    case A.openToday:
      await Notifications.dismissNotificationAsync(id);
      return '/';
    default:
      // A tap on the notification itself.
      if (data.category === 'leftovers') return '/checkin';
      if (data.category === 'sort') return '/inbox/sort';
      return '/';
  }
}
