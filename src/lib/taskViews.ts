// What each screen shows, as pure functions of the data (tested in tests/views.test.ts).
import { addDays, relativeDay, shortDate, timeRange, timeToMinutes, type DateKey, type TimeKey } from './dates.ts';
import type { List, Tag, Task } from '../store/types.ts';

export const isLive = (t: Task) => !t.deletedAt;
export const isOpen = (t: Task) => !t.doneAt && !t.deletedAt;

const byTime = (a: Task, b: Task) => timeToMinutes(a.startTime!) - timeToMinutes(b.startTime!);
const byPriorityThenOrder = (a: Task, b: Task) => b.priority - a.priority || a.sortOrder - b.sortOrder;

export type TodayView = { schedule: Task[]; anytime: Task[]; currentId: string | null };

/** Today: timed tasks on the timeline, untimed below. Done tasks stay visible for the day. Overdue tasks don't appear. */
export function todayView(tasks: Task[], today: DateKey, now: TimeKey): TodayView {
  const dated = tasks.filter((t) => isLive(t) && t.dueDate === today);
  const schedule = dated.filter((t) => t.startTime).sort(byTime);
  const anytime = dated.filter((t) => !t.startTime).sort(byPriorityThenOrder);
  return { schedule, anytime, currentId: currentTaskId(schedule, now) };
}

/** The open timed task happening now (no end time = one hour). */
export function currentTaskId(schedule: Task[], now: TimeKey): string | null {
  const n = timeToMinutes(now);
  const hit = schedule.find((t) => {
    if (t.doneAt || !t.startTime) return false;
    const s = timeToMinutes(t.startTime);
    const e = t.endTime ? timeToMinutes(t.endTime) : s + 60;
    return n >= s && n < e;
  });
  return hit?.id ?? null;
}

/** Days in `days` that have at least one live task. */
export function daysWithItems(tasks: Task[], days: DateKey[]): Set<DateKey> {
  const set = new Set(days);
  return new Set(tasks.filter((t) => isLive(t) && t.dueDate && set.has(t.dueDate)).map((t) => t.dueDate!));
}

export type Group = { key: 'overdue' | 'today' | 'next7' | 'later' | 'noDate'; label: string; tasks: Task[] };

/**
 * A list's tasks grouped Overdue / Today / Next 7 days / Later / No date.
 * `keepIds` keeps just-ticked tasks in place so the done state (and Undo) is visible.
 */
export function listGroups(tasks: Task[], listId: string | null, today: DateKey, keepIds: Set<string> = new Set()): Group[] {
  const mine = tasks.filter((t) => isLive(t) && t.listId === listId && (!t.doneAt || keepIds.has(t.id)));
  const in7 = addDays(today, 7);
  const sortDated = (a: Task, b: Task) =>
    a.dueDate!.localeCompare(b.dueDate!) ||
    (a.startTime ?? '99').localeCompare(b.startTime ?? '99') ||
    byPriorityThenOrder(a, b);
  const groups: Group[] = [
    { key: 'overdue', label: 'Overdue', tasks: mine.filter((t) => t.dueDate && t.dueDate < today).sort(sortDated) },
    { key: 'today', label: 'Today', tasks: mine.filter((t) => t.dueDate === today).sort(sortDated) },
    { key: 'next7', label: 'Next 7 days', tasks: mine.filter((t) => t.dueDate && t.dueDate > today && t.dueDate <= in7).sort(sortDated) },
    { key: 'later', label: 'Later', tasks: mine.filter((t) => t.dueDate && t.dueDate > in7).sort(sortDated) },
    { key: 'noDate', label: 'No date', tasks: mine.filter((t) => !t.dueDate).sort(byPriorityThenOrder) },
  ];
  return groups.filter((g) => g.tasks.length > 0);
}

export function openCount(tasks: Task[], listId: string | null): number {
  return tasks.filter((t) => isOpen(t) && t.listId === listId).length;
}

export function subtaskSummary(t: Task): string | null {
  if (!t.subtasks.length) return null;
  return `${t.subtasks.filter((s) => s.doneAt).length} of ${t.subtasks.length} subtasks`;
}

const tagText = (t: Task, tags: Tag[]) =>
  t.tagIds.map((id) => tags.find((x) => x.id === id)?.name).filter(Boolean).map((n) => `#${n}`).join(' ');

/** Timeline line: "10:00 – 11:00 · Work". */
export function timelineSub(t: Task, lists: List[]): string {
  const list = lists.find((l) => l.id === t.listId)?.name;
  return [timeRange(t.startTime, t.endTime), list].filter(Boolean).join(' · ');
}

/**
 * List-screen line. Today: "10:00 – 11:00 · 1 of 3 subtasks". Other days: "Tue, Oct 20 · #design".
 * Overdue: "Yesterday". No date: "#waiting".
 */
export function listRowSub(t: Task, tags: Tag[], today: DateKey): string {
  const parts: (string | null)[] = [];
  if (t.dueDate === today) parts.push(timeRange(t.startTime, t.endTime) || null);
  else if (t.dueDate) parts.push(relativeDay(t.dueDate, today) + (t.startTime ? `, ${t.startTime}` : ''));
  parts.push(subtaskSummary(t));
  parts.push(tagText(t, tags) || null);
  return parts.filter(Boolean).join(' · ');
}

/** Quick-actions header line: "Tue, Oct 20 · Work · #design". */
export function taskSummaryLine(t: Task, lists: List[], tags: Tag[], today: DateKey): string {
  const list = lists.find((l) => l.id === t.listId)?.name ?? null;
  const date = t.dueDate ? relativeDay(t.dueDate, today) + (t.startTime ? `, ${timeRange(t.startTime, t.endTime)}` : '') : null;
  return [date, list, tagText(t, tags) || null].filter(Boolean).join(' · ');
}

/** "Today, 10:00 – 11:00" for the Date row. */
export function dateValue(t: Pick<Task, 'dueDate' | 'startTime' | 'endTime'>, today: DateKey): string | null {
  if (!t.dueDate) return null;
  const day = relativeDay(t.dueDate, today);
  return t.startTime ? `${day}, ${timeRange(t.startTime, t.endTime)}` : day;
}

export const PRIORITY_LABEL = ['None', 'Low', 'Medium', 'High'] as const;

export function reminderLabel(min: number | null): string {
  if (min == null) return 'None';
  if (min === 0) return 'At the start';
  if (min < 60) return `${min} min before`;
  if (min < 1440) return `${min / 60} hour${min === 60 ? '' : 's'} before`;
  return `${min / 1440} day${min === 1440 ? '' : 's'} before`;
}

export { shortDate };
