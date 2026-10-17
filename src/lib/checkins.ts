// Daily check-ins (behaviour spec §6) as pure functions. Tested in tests/checkins.test.ts.
import { addDays, fromKey, formatTime, nextMonday, type DateKey, type TimeKey } from './dates.ts';
import type { InboxItem, List, Task } from '../store/types.ts';

export type CheckinSettings = {
  morningTime: TimeKey | null;
  afternoonTime: TimeKey | null;
  sortTime: TimeKey | null;
  weekends: boolean;
  remindUntilAct: boolean;
};

export type Kind = 'morning' | 'afternoon' | 'sort';
export type Category = 'leftovers' | 'plain' | 'empty' | 'afternoon' | 'sort';

export type PlannedNotification = {
  id: string; // stable per kind and day, so rescheduling replaces it
  kind: Kind;
  day: DateKey;
  at: Date;
  title: string;
  body: string;
  category: Category;
};

const isWeekend = (day: DateKey) => [0, 6].includes(fromKey(day).getDay());

const atTime = (day: DateKey, t: TimeKey) => {
  const d = fromKey(day);
  const [h, m] = t.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};

/** Tasks that still need doing, ignoring archived/deleted lists. */
function openTasks(tasks: Task[], lists: List[]) {
  const hidden = new Set(lists.filter((l) => l.archivedAt || l.deletedAt).map((l) => l.id));
  return tasks.filter((t) => !t.doneAt && !t.deletedAt && (!t.listId || !hidden.has(t.listId)));
}

/** Leftovers on `day`: open tasks dated before it. */
export function leftovers(tasks: Task[], lists: List[], day: DateKey): Task[] {
  return openTasks(tasks, lists)
    .filter((t) => t.dueDate && t.dueDate < day)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!) || b.priority - a.priority || a.sortOrder - b.sortOrder);
}

/** "A, B and 2 more" / "A, B and C" / "A". */
export function nameList(names: string[], max = 2): string {
  if (names.length <= 1) return names.join('');
  if (names.length <= max + 1) return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${names.slice(0, max).join(', ')} and ${names.length - max} more`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The morning notification (VCheckInNotification or NMorningPlain). */
export function morningContent(tasks: Task[], lists: List[], day: DateKey): { title: string; body: string; category: Category } {
  const left = leftovers(tasks, lists, day);
  if (left.length) {
    const fromYesterday = left.every((t) => t.dueDate === addDays(day, -1));
    return {
      title: `${plural(left.length, 'task')} left ${fromYesterday ? 'from yesterday' : 'over'}`,
      body: `${nameList(left.map((t) => t.title))}. What should we do with ${left.length === 1 ? 'it' : 'them'}?`,
      category: 'leftovers',
    };
  }
  const today = openTasks(tasks, lists)
    .filter((t) => t.dueDate === day)
    .sort((a, b) => (a.startTime ?? '99').localeCompare(b.startTime ?? '99'));
  if (!today.length) return { title: 'Today: nothing planned yet', body: 'A clear day. Add something, or enjoy it.', category: 'empty' };
  const lines = today.slice(0, 3).map((t) => (t.startTime ? `${formatTime(t.startTime)}  ${t.title}` : t.title));
  if (today.length > 3) lines.push(`and ${today.length - 3} more`);
  return { title: `Today: ${plural(today.length, 'task')}`, body: lines.join('\n'), category: 'plain' };
}

/** 14:00, only if something dated today is still open (NAfternoon). */
export function afternoonContent(tasks: Task[], lists: List[], day: DateKey) {
  const open = openTasks(tasks, lists).filter((t) => t.dueDate === day);
  if (!open.length) return null;
  return { title: `Halfway there: ${open.length} still open`, body: `${nameList(open.map((t) => t.title))}.`, category: 'afternoon' as const };
}

/** 18:00, only if the Inbox has notes (NSortNotif). */
export function sortContent(inbox: InboxItem[]) {
  const open = inbox.filter((i) => !i.sortedAt && !i.deletedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!open.length) return null;
  const minutes = Math.max(1, Math.round(open.length / 3));
  return {
    title: `${plural(open.length, 'note')} in your Inbox`,
    body: `${nameList(open.map((i) => i.text))}. ${minutes === 1 ? 'About a minute' : `About ${minutes} minutes`} to sort.`,
    category: 'sort' as const,
  };
}

/**
 * Everything to schedule from `now` for the next `days` days, based on the data as it is now.
 * Tomorrow's leftovers are predicted from today's open tasks, so rescheduling after every change keeps them right.
 */
export function planCheckins(
  data: { tasks: Task[]; lists: List[]; inbox: InboxItem[] },
  s: CheckinSettings,
  now: Date,
  todayKey: DateKey,
  days = 3,
): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(todayKey, i);
    if (isWeekend(day) && !s.weekends) continue;
    const push = (kind: Kind, time: TimeKey | null, c: { title: string; body: string; category: Category } | null) => {
      if (!time || !c) return;
      const at = atTime(day, time);
      if (at <= now) return;
      out.push({ id: `${kind}-${day}`, kind, day, at, ...c });
    };
    const morning = morningContent(data.tasks, data.lists, day);
    push('morning', s.morningTime, morning);
    // Remind until I act: repeat an unanswered leftovers check-in every 15 minutes, up to an hour.
    if (s.remindUntilAct && s.morningTime && morning.category === 'leftovers') {
      for (let r = 1; r <= 4; r++) {
        const at = new Date(atTime(day, s.morningTime).getTime() + r * 15 * 60_000);
        if (at > now) out.push({ id: `morning-${day}-r${r}`, kind: 'morning', day, at, ...morning });
      }
    }
    // Afternoon and Inbox content can only be known for today; later days are predicted the same way.
    push('afternoon', s.afternoonTime, afternoonContent(data.tasks, data.lists, day));
    push('sort', s.sortTime, sortContent(data.inbox));
  }
  return out;
}

// ─── Check-in actions (notification buttons and the full-screen check-in) ──

export type Change = { id: string; dueDate: DateKey | null; doneAt: string | null; carriedOverCount: number; carriedAt: DateKey | null };
export type Choice = 'today' | 'tomorrow' | 'nextWeek' | 'someday' | 'done' | { date: DateKey };

/** What each leftover becomes. Returns the new values plus the old ones (for Undo). */
export function applyChoices(tasks: Task[], choices: Record<string, Choice>, today: DateKey, nowIso: string): { next: Change[]; prev: Change[] } {
  const next: Change[] = [];
  const prev: Change[] = [];
  for (const t of tasks) {
    const c = choices[t.id];
    if (!c) continue;
    prev.push({ id: t.id, dueDate: t.dueDate, doneAt: t.doneAt, carriedOverCount: t.carriedOverCount, carriedAt: t.carriedAt ?? null });
    const moved = (d: DateKey | null): Change => ({ id: t.id, dueDate: d, doneAt: null, carriedOverCount: t.carriedOverCount + 1, carriedAt: today });
    if (c === 'done') next.push({ ...prev[prev.length - 1], doneAt: nowIso });
    else if (c === 'today') next.push(moved(today));
    else if (c === 'tomorrow') next.push(moved(addDays(today, 1)));
    else if (c === 'nextWeek') next.push(moved(nextMonday(today)));
    else if (c === 'someday') next.push({ ...moved(null), carriedAt: null });
    else next.push(moved(c.date));
  }
  return { next, prev };
}

/** Snackbar after the check-in: "2 moved to today, 1 to Monday" / "1 marked done". */
export function summarize(next: Change[], today: DateKey, dayName: (d: DateKey) => string): { title: string; sub?: string } {
  const toToday = next.filter((c) => !c.doneAt && c.dueDate === today).length;
  const later = new Map<string, number>();
  for (const c of next) {
    if (c.doneAt || c.dueDate === today) continue;
    const label = c.dueDate ? dayName(c.dueDate) : 'Someday';
    later.set(label, (later.get(label) ?? 0) + 1);
  }
  const done = next.filter((c) => c.doneAt).length;
  const parts = [...(toToday ? [`${toToday} moved to today`] : []), ...[...later].map(([d, n]) => `${n} to ${d}`)];
  const doneText = done ? `${done} marked done` : undefined;
  if (!parts.length) return { title: doneText ?? 'Nothing changed' };
  return { title: parts.join(', '), sub: doneText };
}
