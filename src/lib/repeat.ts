// Repeat rules, stored as a small RRULE subset: FREQ=DAILY|WEEKLY|MONTHLY|YEARLY[;BYDAY=MO,FR].
import { addDays, fromKey, monthShort, toKey, type DateKey } from './dates.ts';

export type RepeatFreq = 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RepeatRule = { freq: RepeatFreq; days: number[] }; // days: 0 = Sunday … 6 = Saturday

const CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseRule(rule: string | null | undefined): RepeatRule {
  if (!rule) return { freq: 'never', days: [] };
  const parts = Object.fromEntries(rule.split(';').map((p) => p.split('=') as [string, string]));
  const freq = ({ DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' } as const)[parts.FREQ as 'DAILY'] ?? 'never';
  const days = parts.BYDAY ? parts.BYDAY.split(',').map((c) => CODES.indexOf(c)).filter((i) => i >= 0).sort() : [];
  return { freq, days };
}

export function formatRule(r: RepeatRule): string | null {
  switch (r.freq) {
    case 'never':
      return null;
    case 'daily':
      return 'FREQ=DAILY';
    case 'weekly':
      return r.days.length ? `FREQ=WEEKLY;BYDAY=${[...r.days].sort().map((d) => CODES[d]).join(',')}` : 'FREQ=WEEKLY';
    case 'monthly':
      return 'FREQ=MONTHLY';
    case 'yearly':
      return 'FREQ=YEARLY';
  }
}

/** The next date after `from` that the rule lands on. */
export function nextOccurrence(rule: string | null | undefined, from: DateKey): DateKey | null {
  const r = parseRule(rule);
  const d = fromKey(from);
  switch (r.freq) {
    case 'never':
      return null;
    case 'daily':
      return addDays(from, 1);
    case 'weekly': {
      const days = r.days.length ? r.days : [d.getDay()];
      for (let i = 1; i <= 7; i++) {
        const k = addDays(from, i);
        if (days.includes(fromKey(k).getDay())) return k;
      }
      return addDays(from, 7);
    }
    case 'monthly': {
      const day = d.getDate();
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(day, last));
      return toKey(next);
    }
    case 'yearly':
      return toKey(new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()));
  }
}

/** First date on or after `start` the rule lands on (for "starting Oct 23"). */
export function firstOccurrence(rule: string | null | undefined, start: DateKey): DateKey {
  const r = parseRule(rule);
  if (r.freq === 'weekly' && r.days.length && !r.days.includes(fromKey(start).getDay())) {
    return nextOccurrence(rule, start) ?? start;
  }
  return start;
}

const list = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** "Every Friday, starting Oct 23" */
export function describeRule(rule: string | null | undefined, start: DateKey): string {
  const r = parseRule(rule);
  if (r.freq === 'never') return 'Does not repeat';
  const s = fromKey(firstOccurrence(rule, start));
  const starting = `starting ${monthShort(s.getMonth())} ${s.getDate()}`;
  switch (r.freq) {
    case 'daily':
      return `Every day, ${starting}`;
    case 'weekly': {
      const days = r.days.length ? r.days : [fromKey(start).getDay()];
      return `Every ${list(days.map((d) => DAY_NAMES[d]))}, ${starting}`;
    }
    case 'monthly':
      return `Every month on day ${s.getDate()}, ${starting}`;
    case 'yearly':
      return `Every year on ${monthShort(s.getMonth())} ${s.getDate()}`;
  }
}

/** Short label for rows: "Never", "Every day", "Every Fri". */
export function shortRuleLabel(rule: string | null | undefined): string {
  const r = parseRule(rule);
  switch (r.freq) {
    case 'never':
      return 'Never';
    case 'daily':
      return 'Every day';
    case 'weekly':
      return r.days.length ? `Every ${r.days.map((d) => DAY_NAMES[d].slice(0, 3)).join(', ')}` : 'Every week';
    case 'monthly':
      return 'Every month';
    case 'yearly':
      return 'Every year';
  }
}
