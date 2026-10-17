// What each screen shows, as pure functions of the data (tested in tests/views.test.ts).
import { addDays, formatTime, relativeDay, shortDate, timeRange, timeToMinutes, type DateKey, type TimeKey } from './dates.ts';
import type { List, Tag, Task } from '../store/types.ts';

export const isLive = (t: Task) => !t.deletedAt;
export const isOpen = (t: Task) => !t.doneAt && !t.deletedAt;

const byTime = (a: Task, b: Task) => timeToMinutes(a.startTime!) - timeToMinutes(b.startTime!);
const byPriorityThenOrder = (a: Task, b: Task) => b.priority - a.priority || a.sortOrder - b.sortOrder;

export type TodayView = { carried: Task[]; schedule: Task[]; anytime: Task[]; currentId: string | null };

/**
 * Today: tasks the morning check-in just moved ("From yesterday", NAfterCheckin), timed tasks on the timeline,
 * untimed below. Done tasks stay visible for the day. Overdue tasks don't appear.
 */
export function todayView(tasks: Task[], today: DateKey, now: TimeKey): TodayView {
  const all = tasks.filter((t) => isLive(t) && t.dueDate === today);
  const carried = all.filter((t) => t.carriedAt === today && !t.startTime).sort(byPriorityThenOrder);
  const dated = all.filter((t) => !carried.includes(t));
  const schedule = dated.filter((t) => t.startTime).sort(byTime);
  const anytime = dated.filter((t) => !t.startTime).sort(byPriorityThenOrder);
  return { carried, schedule, anytime, currentId: currentTaskId(schedule, now) };
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
  else if (t.dueDate) parts.push(relativeDay(t.dueDate, today) + (t.startTime ? `, ${formatTime(t.startTime)}` : ''));
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

// ─── Milestone 2 views ─────────────────────────────────────────────────────

/** Tasks whose list is archived or deleted are hidden everywhere except Trash. */
export function visibleTasks(tasks: Task[], lists: List[]): Task[] {
  const hidden = new Set(lists.filter((l) => l.archivedAt || l.deletedAt).map((l) => l.id));
  return hidden.size ? tasks.filter((t) => !t.listId || !hidden.has(t.listId)) : tasks;
}

export const liveLists = (lists: List[]) => lists.filter((l) => !l.archivedAt && !l.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);

/** Sorting inside a list's groups (NListMenu › Sort tasks by). */
export function sortTasks(tasks: Task[], by: 'date' | 'priority' | 'title'): Task[] {
  const byDate = (a: Task, b: Task) =>
    (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || (a.startTime ?? '99').localeCompare(b.startTime ?? '99') || a.sortOrder - b.sortOrder;
  const cmp = by === 'priority' ? (a: Task, b: Task) => b.priority - a.priority || byDate(a, b) : by === 'title' ? (a: Task, b: Task) => a.title.localeCompare(b.title) : byDate;
  return [...tasks].sort(cmp);
}

export type DayGroup = { key: DateKey; tasks: Task[] };

/** NNext7: today and the six days after, open and just-done tasks per day. */
export function next7View(tasks: Task[], today: DateKey): DayGroup[] {
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i);
    const day = tasks
      .filter((t) => isLive(t) && t.dueDate === key)
      .sort((a, b) => (a.startTime ?? '99').localeCompare(b.startTime ?? '99') || b.priority - a.priority || a.sortOrder - b.sortOrder);
    return { key, tasks: day };
  });
}

export type AllMode = 'list' | 'date' | 'priority';
export type AllGroup = { key: string; label: string; listId?: string | null; color?: string; tasks: Task[] };

/** NAllTasks: open tasks grouped by list, date or priority. */
export function allTasksGroups(tasks: Task[], lists: List[], mode: AllMode, today: DateKey): AllGroup[] {
  const open = tasks.filter(isOpen);
  const dated = (ts: Task[]) => sortTasks(ts, 'date');
  if (mode === 'list') {
    const groups: AllGroup[] = liveLists(lists).map((l) => ({ key: l.id, label: l.name, listId: l.id, color: l.color, tasks: dated(open.filter((t) => t.listId === l.id)) }));
    groups.push({ key: 'none', label: 'No list', listId: null, tasks: dated(open.filter((t) => !t.listId)) });
    return groups.filter((g) => g.tasks.length);
  }
  if (mode === 'priority') {
    return [3, 2, 1, 0]
      .map((p) => ({ key: `p${p}`, label: PRIORITY_LABEL[p], tasks: dated(open.filter((t) => t.priority === p)) }))
      .filter((g) => g.tasks.length);
  }
  const in7 = addDays(today, 7);
  const tomorrow = addDays(today, 1);
  return [
    { key: 'overdue', label: 'Overdue', tasks: open.filter((t) => t.dueDate && t.dueDate < today) },
    { key: 'today', label: 'Today', tasks: open.filter((t) => t.dueDate === today) },
    { key: 'tomorrow', label: 'Tomorrow', tasks: open.filter((t) => t.dueDate === tomorrow) },
    { key: 'next7', label: 'Next 7 days', tasks: open.filter((t) => t.dueDate && t.dueDate > tomorrow && t.dueDate <= in7) },
    { key: 'later', label: 'Later', tasks: open.filter((t) => t.dueDate && t.dueDate > in7) },
    { key: 'noDate', label: 'No date', tasks: open.filter((t) => !t.dueDate) },
  ]
    .map((g) => ({ ...g, tasks: dated(g.tasks) }))
    .filter((g) => g.tasks.length);
}

/** "Today, 10:00" / "Yesterday" / "Tue, Oct 20" (NAllTasks rows). */
export function dueShort(t: Task, today: DateKey): string {
  if (!t.dueDate) return 'No date';
  return relativeDay(t.dueDate, today) + (t.startTime ? `, ${formatTime(t.startTime)}` : '');
}

/** NTagView: Overdue / Today / Later / No date. */
export function tagGroups(tasks: Task[], tagId: string, today: DateKey, keepIds: Set<string> = new Set()): Group[] {
  const mine = tasks.filter((t) => isLive(t) && t.tagIds.includes(tagId) && (!t.doneAt || keepIds.has(t.id)));
  return [
    { key: 'overdue' as const, label: 'Overdue', tasks: mine.filter((t) => t.dueDate && t.dueDate < today) },
    { key: 'today' as const, label: 'Today', tasks: mine.filter((t) => t.dueDate === today) },
    { key: 'later' as const, label: 'Later', tasks: mine.filter((t) => t.dueDate && t.dueDate > today) },
    { key: 'noDate' as const, label: 'No date', tasks: mine.filter((t) => !t.dueDate) },
  ]
    .map((g) => ({ ...g, tasks: sortTasks(g.tasks, 'date') }))
    .filter((g) => g.tasks.length);
}

/** NCompleted: done tasks by the day they were done, newest first. */
export function completedGroups(tasks: Task[], listId: string | 'all', toKey: (iso: string) => DateKey): DayGroup[] {
  const done = tasks
    .filter((t) => t.doneAt && !t.deletedAt && (listId === 'all' || t.listId === listId))
    .sort((a, b) => b.doneAt!.localeCompare(a.doneAt!));
  const groups: DayGroup[] = [];
  for (const t of done) {
    const key = toKey(t.doneAt!);
    const g = groups[groups.length - 1];
    if (g && g.key === key) g.tasks.push(t);
    else groups.push({ key, tasks: [t] });
  }
  return groups;
}

export const TRASH_DAYS = 30;

export function daysLeft(deletedAt: string, now: Date): number {
  return Math.max(0, TRASH_DAYS - Math.floor((now.getTime() - new Date(deletedAt).getTime()) / 86_400_000));
}

export type TrashEntry = { kind: 'task' | 'inbox' | 'note'; id: string; title: string; deletedAt: string };

/** NTrash: deleted tasks, Inbox notes and notes, most recently deleted first. */
export function trashEntries(
  tasks: Task[],
  inbox: { id: string; text: string; deletedAt: string | null }[],
  notes: { id: string; title: string; deletedAt: string | null }[],
): TrashEntry[] {
  return [
    ...tasks.filter((t) => t.deletedAt).map((t) => ({ kind: 'task' as const, id: t.id, title: t.title, deletedAt: t.deletedAt! })),
    ...inbox.filter((i) => i.deletedAt).map((i) => ({ kind: 'inbox' as const, id: i.id, title: i.text, deletedAt: i.deletedAt! })),
    ...notes.filter((n) => n.deletedAt).map((n) => ({ kind: 'note' as const, id: n.id, title: n.title || 'Untitled note', deletedAt: n.deletedAt! })),
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export type SearchResults = {
  tasks: Task[];
  notes: { kind: 'note' | 'inbox'; id: string; title: string; createdAt: string }[];
  lists: List[];
};

/** VSearch: case-insensitive match on titles, notes and tag names (a leading # searches tags). */
export function search(
  q: string,
  data: { tasks: Task[]; lists: List[]; tags: Tag[]; inbox: { id: string; text: string; deletedAt: string | null; sortedAt: string | null; createdAt: string }[]; notes: { id: string; title: string; body: { text: string }[]; deletedAt: string | null; createdAt: string }[] },
): SearchResults {
  const needle = q.trim().toLowerCase();
  if (!needle) return { tasks: [], notes: [], lists: [] };
  const tagNeedle = needle.startsWith('#') ? needle.slice(1) : needle;
  const tagIds = new Set(data.tags.filter((t) => t.name.includes(tagNeedle)).map((t) => t.id));
  const has = (s: string) => s.toLowerCase().includes(needle);
  const tasks = visibleTasks(data.tasks, data.lists)
    .filter((t) => !t.deletedAt && (has(t.title) || has(t.notes) || t.tagIds.some((id) => tagIds.has(id))))
    .sort((a, b) => Number(!!a.doneAt) - Number(!!b.doneAt) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  const notes = [
    ...data.inbox.filter((i) => !i.deletedAt && !i.sortedAt && has(i.text)).map((i) => ({ kind: 'inbox' as const, id: i.id, title: i.text, createdAt: i.createdAt })),
    ...data.notes
      .filter((n) => !n.deletedAt && (has(n.title) || n.body.some((b) => has(b.text))))
      .map((n) => ({ kind: 'note' as const, id: n.id, title: n.title || 'Untitled note', createdAt: n.createdAt })),
  ];
  const lists = liveLists(data.lists).filter((l) => has(l.name));
  return { tasks, notes, lists };
}

/** Splits text into plain and matching parts for <mark>-style highlighting. */
export function highlightParts(text: string, q: string): { t: string; hit: boolean }[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [{ t: text, hit: false }];
  const parts: { t: string; hit: boolean }[] = [];
  const lower = text.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const at = lower.indexOf(needle, i);
    if (at < 0) {
      parts.push({ t: text.slice(i), hit: false });
      break;
    }
    if (at > i) parts.push({ t: text.slice(i, at), hit: false });
    parts.push({ t: text.slice(at, at + needle.length), hit: true });
    i = at + needle.length;
  }
  return parts;
}

/** "10:00 – 11:00" or "" for a task. */
export const timeRangeOf = (t: Task) => timeRange(t.startTime, t.endTime);

/** "moved twice" / "moved 3 times" once a task keeps getting carried over. */
export function movedLabel(count: number): string | null {
  if (count < 2) return null;
  return count === 2 ? 'moved twice' : `moved ${count} times`;
}
