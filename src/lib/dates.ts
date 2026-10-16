// Plain date helpers. Dates are stored as local 'YYYY-MM-DD' strings and times as 'HH:MM'.
// Kept free of app imports so they can be unit-tested with `node --test`.

export type DateKey = string; // 'YYYY-MM-DD'
export type TimeKey = string; // 'HH:MM'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now = new Date()): DateKey {
  return toKey(now);
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
}

export function weekdayShort(key: DateKey): string {
  return WEEKDAYS[fromKey(key).getDay()].slice(0, 3);
}

export function monthShort(monthIndex: number): string {
  return MONTHS[monthIndex].slice(0, 3);
}

export function monthName(monthIndex: number): string {
  return MONTHS[monthIndex];
}

/** "Friday, October 16" */
export function longDate(key: DateKey): string {
  const d = fromKey(key);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Tue, Oct 20" */
export function shortDate(key: DateKey): string {
  const d = fromKey(key);
  return `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

/** "Oct 14" */
export function monthDay(key: DateKey): string {
  const d = fromKey(key);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

/** Today / Tomorrow / Yesterday, else "Tue, Oct 20". */
export function relativeDay(key: DateKey, today: DateKey): string {
  const diff = daysBetween(today, key);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return shortDate(key);
}

/** Lowercase form used inside sentences: "Added for tomorrow, 15:00". */
export function relativeDayInSentence(key: DateKey, today: DateKey): string {
  const r = relativeDay(key, today);
  return r === 'Today' || r === 'Tomorrow' || r === 'Yesterday' ? r.toLowerCase() : r;
}

export function timeRange(start: TimeKey | null, end: TimeKey | null): string {
  if (!start) return '';
  return end ? `${start} – ${end}` : start;
}

/** The 7 days of the week containing `key`, starting on `weekStart` (0 = Sunday). */
export function weekOf(key: DateKey, weekStart = 0): DateKey[] {
  const d = fromKey(key);
  const offset = (d.getDay() - weekStart + 7) % 7;
  const first = addDays(key, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Next Monday strictly after `key` ("Next week"). */
export function nextMonday(key: DateKey): DateKey {
  const day = fromKey(key).getDay();
  const delta = ((8 - day) % 7) || 7;
  return addDays(key, delta);
}

/** Month grid cells (leading days from the previous month included), weeks start on `weekStart`. */
export function monthGrid(year: number, month: number, weekStart = 0): { key: DateKey; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { key: DateKey; inMonth: boolean }[] = [];
  for (let i = lead; i > 0; i--) cells.push({ key: toKey(new Date(year, month, 1 - i)), inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ key: toKey(new Date(year, month, d)), inMonth: true });
  return cells;
}

export function timeToMinutes(t: TimeKey): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(min: number): TimeKey {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function nowTime(now = new Date()): TimeKey {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
