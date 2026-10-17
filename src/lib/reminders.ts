// Task reminders ("Reminder" in Date and reminder) as a pure plan. Tested in tests/reminders.test.ts.
import { addDays, formatTime, fromKey, type DateKey, type TimeKey } from './dates.ts';
import { isOpen, visibleTasks } from './taskViews.ts';
import type { List, Task } from '../store/types.ts';

/** Untimed tasks remind at 09:00 on the day (NReminder footnote). */
export const UNTIMED_REMINDER: TimeKey = '09:00';

export type PlannedReminder = { id: string; taskId: string; at: Date; title: string; body: string };

const at = (day: DateKey, time: TimeKey) => {
  const d = fromKey(day);
  d.setHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
  return d;
};

const before = (min: number) => (min >= 1440 ? (min === 1440 ? 'tomorrow' : `in ${Math.round(min / 1440)} days`) : min >= 60 ? (min === 60 ? 'in 1 hour' : `in ${min / 60} hours`) : `in ${min} min`);

/** Reminders for open tasks due in the next `days` days whose reminder time is still ahead. */
export function planTaskReminders(tasks: Task[], lists: List[], now: Date, today: DateKey, days = 3): PlannedReminder[] {
  const last = addDays(today, days - 1);
  const out: PlannedReminder[] = [];
  for (const t of visibleTasks(tasks, lists)) {
    if (!isOpen(t) || t.reminderMinutes == null || !t.dueDate || t.dueDate > last) continue;
    const start = at(t.dueDate, t.startTime ?? UNTIMED_REMINDER);
    const when = new Date(start.getTime() - t.reminderMinutes * 60_000);
    if (when <= now) continue;
    const timeText = t.startTime ? formatTime(t.startTime) : null;
    const body = !timeText ? 'Due today' : t.reminderMinutes === 0 ? `Starts now · ${timeText}` : `Starts ${before(t.reminderMinutes)} · ${timeText}`;
    out.push({ id: `task-${t.id}`, taskId: t.id, at: when, title: t.title, body });
  }
  return out;
}
