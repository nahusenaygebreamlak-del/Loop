// Inbox and Notes, as pure functions (tested in tests/inbox.test.ts).
import { addDays, formatTime, fromKey, monthDay, toKey, weekdayLong, weekdayShort, type DateKey } from './dates.ts';
import type { InboxItem, Note } from '../store/types.ts';

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (d: Date) => formatTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);

/** Unsorted Inbox notes, newest first (VInbox). */
export function inboxOpen(inbox: InboxItem[]): InboxItem[] {
  return inbox.filter((i) => !i.sortedAt && !i.deletedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** "About 2 minutes" — roughly 20 seconds a note. */
export function sortEstimate(count: number): string {
  const min = Math.max(1, Math.round(count / 3));
  return `About ${min} minute${min === 1 ? '' : 's'}`;
}

/** Inbox row time: "Today, 09:12", "Yesterday", "Wed", "Oct 2". */
export function stampShort(iso: string, today: DateKey): string {
  const d = new Date(iso);
  const key = toKey(d);
  if (key === today) return `Today, ${clock(d)}`;
  if (key === addDays(today, -1)) return 'Yesterday';
  if (key > addDays(today, -7)) return weekdayShort(key);
  return monthDay(key);
}

/** Sort card line: "Added yesterday, 19:40", "Added Wednesday, 21:15". */
export function addedLine(iso: string, today: DateKey): string {
  const d = new Date(iso);
  const key = toKey(d);
  const day = key === today ? 'today' : key === addDays(today, -1) ? 'yesterday' : key > addDays(today, -7) ? weekdayLong(key) : monthDay(key);
  return `Added ${day}, ${clock(d)}`;
}

/** Notes sorted in a session, in the order they were sorted today (NUndoSorting). */
export function sortedToday(inbox: InboxItem[], today: DateKey): InboxItem[] {
  return inbox.filter((i) => i.sortedAt && toKey(new Date(i.sortedAt)) === today).sort((a, b) => a.sortedAt!.localeCompare(b.sortedAt!));
}

export function sortSummary(items: InboxItem[]) {
  return {
    tasks: items.filter((i) => i.sortedOutcome === 'task').length,
    notes: items.filter((i) => i.sortedOutcome === 'note').length,
    deleted: items.filter((i) => i.sortedOutcome === 'deleted').length,
  };
}

/** "This week" when sorting: the last day of the current week. */
export function endOfWeek(today: DateKey, weekStart: number): DateKey {
  const day = fromKey(today).getDay();
  const last = (weekStart + 6) % 7;
  return addDays(today, (last - day + 7) % 7);
}

/** Notes list: pinned first, then most recently edited. */
export function notesList(notes: Note[]): Note[] {
  return notes.filter((n) => !n.deletedAt).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
}

/** Card preview: text, with checklists as "☐ Charger, ☑ Tickets". */
export function notePreview(n: Note): string {
  const text = n.body.filter((b) => b.type !== 'checklist' && b.text.trim()).map((b) => b.text.trim());
  const checks = n.body.filter((b) => b.type === 'checklist' && b.text.trim()).map((b) => `${b.done ? '☑' : '☐'} ${b.text.trim()}`);
  return [...text, ...(checks.length ? [checks.join(', ')] : [])].join(' ');
}

/** "1 of 4 checked", or null without a checklist. */
export function checklistCount(n: Note): string | null {
  const items = n.body.filter((b) => b.type === 'checklist' && b.text.trim());
  return items.length ? `${items.filter((b) => b.done).length} of ${items.length} checked` : null;
}

/** "Edited today", "Yesterday", "Tue", "Oct 2". */
export function noteDate(n: Note, today: DateKey): string {
  const key = toKey(new Date(n.updatedAt));
  if (key === today) return 'Edited today';
  if (key === addDays(today, -1)) return 'Yesterday';
  if (key > addDays(today, -7)) return weekdayShort(key);
  return monthDay(key);
}

export const isEmptyNote = (n: Note) => !n.title.trim() && n.body.every((b) => !b.text.trim());
