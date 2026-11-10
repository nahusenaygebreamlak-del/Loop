// The morning debrief (docs/13 §2.2) as pure functions. Tested in tests/debrief.test.ts.
import { addDays, fromKey, weekdayLong, type DateKey } from './dates.ts';
import { isOver } from './seasons.ts';
import type { Debrief, Season, Task } from '../store/types.ts';

const isWeekend = (day: DateKey) => [0, 6].includes(fromKey(day).getDay());

export type YesterdayRange = { from: DateKey; to: DateKey; label: string };

/**
 * "Yesterday" is everything since the last day the check-ins ran.
 * With weekends off, Monday covers Friday to Sunday and reads "Since Friday".
 */
export function yesterdayRange(today: DateKey, weekends: boolean): YesterdayRange {
  const to = addDays(today, -1);
  let from = to;
  if (!weekends) {
    // Walk back over the weekend to the last weekday.
    for (let i = 0; i < 2 && isWeekend(from); i++) from = addDays(from, -1);
  }
  return { from, to, label: from === to ? 'Yesterday' : `Since ${weekdayLong(from)}` };
}

export type YesterdaySummary = { count: number; titles: string[]; more: number; line: string };

/** What got ticked off in the range: the count, the newest three titles, and how many more. */
export function yesterdaySummary(tasks: Task[], range: YesterdayRange, toKey: (iso: string) => DateKey): YesterdaySummary {
  const done = tasks
    .filter((t) => t.doneAt && !t.deletedAt)
    .filter((t) => {
      const day = toKey(t.doneAt!);
      return day >= range.from && day <= range.to;
    })
    .sort((a, b) => b.doneAt!.localeCompare(a.doneAt!));
  const count = done.length;
  return {
    count,
    titles: done.slice(0, 3).map((t) => t.title),
    more: Math.max(0, count - 3),
    line: count === 0 ? 'Nothing ticked off yesterday. That’s fine.' : `${count} task${count === 1 ? '' : 's'} finished`,
  };
}

/** The day's debrief rows (usually one; two devices can each make one). */
export const debriefsOf = (debriefs: Debrief[], day: DateKey) => debriefs.filter((d) => d.day === day);

/** Answered on any device. */
export const isAnswered = (debriefs: Debrief[], day: DateKey) => debriefs.some((d) => d.day === day && !!d.answeredAt);

/** Days whose debrief is answered: "Remind until I act" stops for them. */
export const answeredDays = (debriefs: Debrief[]): Set<DateKey> => new Set(debriefs.filter((d) => d.answeredAt).map((d) => d.day));

/**
 * Closing the page answers the debrief only on a quiet morning (nothing left over when it opened)
 * and only after a real look (2 seconds). With leftovers untouched, closing changes nothing,
 * so a quick peek doesn't silence the reminders.
 */
export function closingAnswers(hadLeftovers: boolean, openedMs: number, nowMs: number): boolean {
  return !hadLeftovers && nowMs - openedMs >= 2000;
}

/** The menu item "Debrief" shows until the debrief is answered, or until noon. */
export function showDebriefItem(debriefs: Debrief[], day: DateKey, now: Date): boolean {
  return !isAnswered(debriefs, day) && now.getHours() < 12;
}

/**
 * The season that just ran out, for the "Your season ended" card: past its last day (not ended by hand),
 * no other season running or waiting, and not dismissed. Shows from the day after the end date.
 */
export function endedSeasonToShow(seasons: Season[], today: DateKey, dismissed: string[]): Season | null {
  if (seasons.some((s) => !isOver(s, today))) return null;
  const last = seasons.filter((s) => !s.endedAt && s.endDate < today).sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  return last && !dismissed.includes(last.id) ? last : null;
}

/** The one line on the computer's Today card: "3 left over" / "Nothing left over" plus yesterday's count. */
export function cardLine(leftCount: number, y: YesterdaySummary, range: YesterdayRange): string {
  const left = leftCount ? `${leftCount} left over` : 'Nothing left over';
  const done = y.count ? `${y.count} finished ${range.label === 'Yesterday' ? 'yesterday' : range.label.toLowerCase()}` : 'nothing ticked off yesterday';
  return `${left} · ${done}`;
}
