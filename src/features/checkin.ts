import { goMain } from './nav';
import { summarize, type Change } from '@/lib/checkins';
import { todayKey, weekdayLong, relativeDay } from '@/lib/dates';
import { useStore } from '@/store/store';
import { pushSnack } from '@/components/Snackbar';
import { cancelMorningReminders } from '@/notifications/schedule';

/** Applies the check-in, goes to Today and shows the summary with Undo (NAfterCheckin). */
export function finishCheckin(next: Change[], prev: Change[]) {
  const today = todayKey();
  useStore.getState().applyCheckin(next);
  void cancelMorningReminders(today).catch(() => {});
  goMain('/');
  const dayName = (d: string) => {
    const r = relativeDay(d, today);
    return r === 'Tomorrow' ? 'tomorrow' : r.includes(',') ? weekdayLong(d) : r;
  };
  const s = summarize(next, today, dayName);
  pushSnack({ ...s, actions: [{ label: 'Undo', onPress: () => useStore.getState().applyCheckin(prev) }] });
}
