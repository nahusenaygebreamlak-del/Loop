// Google events as Loop sees them (pure; tested in tests/events.test.ts).
import { addDays, toKey, type DateKey, type TimeKey } from './dates.ts';

export type GEvent = {
  id: string;
  calendarId: string;
  calendarName: string;
  title: string;
  /** ISO date-time, or YYYY-MM-DD for all-day events. */
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  description: string | null;
  attendees: string[];
  link: string | null;
};

const pad = (n: number) => String(n).padStart(2, '0');
const timeOf = (d: Date): TimeKey => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** The local day an event starts on. */
export function eventDay(e: GEvent): DateKey {
  return e.allDay ? (e.start.slice(0, 10) as DateKey) : toKey(new Date(e.start));
}

/** Every local day an event covers (all-day events end the day before their `end`). */
export function eventDays(e: GEvent): DateKey[] {
  const first = eventDay(e);
  const last = e.allDay ? addDays(e.end.slice(0, 10) as DateKey, -1) : toKey(new Date(new Date(e.end).getTime() - 1));
  const out: DateKey[] = [];
  for (let d = first; d <= last && out.length < 62; d = addDays(d, 1)) out.push(d);
  return out.length ? out : [first];
}

export function eventStart(e: GEvent): TimeKey | null {
  return e.allDay ? null : timeOf(new Date(e.start));
}
export function eventEnd(e: GEvent): TimeKey | null {
  return e.allDay ? null : timeOf(new Date(e.end));
}

/** Timed events on a day, in time order (hidden ones left out). */
export function eventsOn(events: GEvent[], day: DateKey, hidden: string[] = []): GEvent[] {
  return events
    .filter((e) => !hidden.includes(e.id) && eventDays(e).includes(day))
    .sort((a, b) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1));
}
