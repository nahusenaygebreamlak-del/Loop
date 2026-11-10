// Seasons and tiers (docs/13 §2.1) as pure functions. Tested in tests/seasons.test.ts.
import { addDays, daysBetween, monthDay, type DateKey } from './dates.ts';
import type { List, Season, Task, Tier } from '../store/types.ts';

export const TIERS: Tier[] = ['core', 'secondary', 'support'];
export const TIER_LABEL: Record<Tier, string> = { core: 'Core', secondary: 'Secondary', support: 'Support' };
export const TIER_HINT: Record<Tier, string> = { core: 'Must happen this season', secondary: 'Nice to have', support: 'Upkeep, not a focus' };

export const DEFAULT_WEEKS = 12;
export const LENGTH_CHOICES = [6, 8, 12, 16];

/** Last day of a season of `weeks` weeks, counting both the first and last day. */
export const endFor = (start: DateKey, weeks = DEFAULT_WEEKS): DateKey => addDays(start, weeks * 7 - 1);

/** Running today: inside its dates and not ended early. */
export const isActive = (s: Season, today: DateKey) => !s.endedAt && s.startDate <= today && today <= s.endDate;
/** Saved for later: not ended, and starting after today. */
export const isUpcoming = (s: Season, today: DateKey) => !s.endedAt && s.startDate > today;
/** Over: ended early, or past its last day. */
export const isOver = (s: Season, today: DateKey) => !!s.endedAt || s.endDate < today;

export function activeSeason(seasons: Season[], today: DateKey): Season | null {
  return seasons.find((s) => isActive(s, today)) ?? null;
}

/** The active season, or else the next one waiting to start. */
export function currentSeason(seasons: Season[], today: DateKey): Season | null {
  return activeSeason(seasons, today) ?? seasons.filter((s) => isUpcoming(s, today)).sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;
}

/** Finished seasons, newest first. */
export function pastSeasons(seasons: Season[], today: DateKey): Season[] {
  return seasons.filter((s) => isOver(s, today)).sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/** "Season 2" for unnamed seasons, numbered in the order they started. */
export function seasonName(s: Season, seasons: Season[]): string {
  if (s.name?.trim()) return s.name.trim();
  const order = [...seasons].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.createdAt.localeCompare(b.createdAt));
  return `Season ${Math.max(0, order.findIndex((x) => x.id === s.id)) + 1}`;
}

/** Whole weeks in the season; a custom length rounds up. */
export const totalWeeks = (s: Pick<Season, 'startDate' | 'endDate'>) => Math.max(1, Math.ceil((daysBetween(s.startDate, s.endDate) + 1) / 7));

/** Week number today, counted from the start date and kept inside 1…N. */
export function weekNumber(s: Pick<Season, 'startDate' | 'endDate'>, today: DateKey): number {
  const n = Math.floor(daysBetween(s.startDate, today) / 7) + 1;
  return Math.min(totalWeeks(s), Math.max(1, n));
}

/** Days still to go, including today. 0 once it's over. */
export const daysLeft = (s: Pick<Season, 'endDate'>, today: DateKey) => Math.max(0, daysBetween(today, s.endDate) + 1);

/** How far through the season today is, 0…1. */
export function progress(s: Pick<Season, 'startDate' | 'endDate'>, today: DateKey): number {
  const total = daysBetween(s.startDate, s.endDate) + 1;
  return Math.min(1, Math.max(0, (daysBetween(s.startDate, today) + 1) / total));
}

/** "Week 3 of 12" */
export const weekLine = (s: Season, today: DateKey) => `Week ${weekNumber(s, today)} of ${totalWeeks(s)}`;
/** "Wk 3/12" for menus. */
export const weekShort = (s: Season, today: DateKey) => `Wk ${weekNumber(s, today)}/${totalWeeks(s)}`;
/** "Oct 27 – Jan 18" */
export const dateRange = (s: Pick<Season, 'startDate' | 'endDate'>) => `${monthDay(s.startDate)} – ${monthDay(s.endDate)}`;

/** A list's tier this season. Anything unmarked is Support. */
export const tierOf = (s: Season | null, listId: string): Tier => s?.tiers[listId] ?? 'support';

/** Live lists split by tier, each in the usual list order. */
export function groupByTier(lists: List[], s: Season | null): Record<Tier, List[]> {
  const out: Record<Tier, List[]> = { core: [], secondary: [], support: [] };
  for (const l of lists) {
    if (l.archivedAt || l.deletedAt) continue;
    out[tierOf(s, l.id)].push(l);
  }
  for (const t of TIERS) out[t].sort((a, b) => a.sortOrder - b.sortOrder);
  return out;
}

/** True when these dates would run into another season that hasn't ended. */
export function overlaps(seasons: Season[], start: DateKey, end: DateKey, today: DateKey, ignoreId?: string): boolean {
  return seasons.some((s) => s.id !== ignoreId && !isOver(s, today) && s.startDate <= end && start <= s.endDate);
}

/** Why a season with these dates can't be saved, or null when it can. */
export function dateProblem(seasons: Season[], start: DateKey, end: DateKey, today: DateKey, ignoreId?: string): string | null {
  if (end < start) return 'The end date is before the start date.';
  if (end < today) return 'These dates are already over.';
  if (overlaps(seasons, start, end, today, ignoreId)) return 'These dates run into another season. End that one first.';
  return null;
}

/** Tiers with ids of lists that no longer exist removed, and plain Support left out. */
export function cleanTiers(tiers: Record<string, Tier>, lists: List[]): Record<string, Tier> {
  const live = new Set(lists.filter((l) => !l.deletedAt).map((l) => l.id));
  const out: Record<string, Tier> = {};
  for (const [id, t] of Object.entries(tiers)) if (live.has(id) && t !== 'support') out[id] = t;
  return out;
}

/** The one note under the season line: the first core list with nothing ticked off in the last 7 days. */
export function coreNote(s: Season, lists: List[], tasks: Task[], today: DateKey, toKey: (iso: string) => DateKey): string | null {
  const from = addDays(today, -7);
  // A season that has only just started hasn't had a "last week" yet.
  if (daysBetween(s.startDate, today) < 7) return null;
  for (const l of groupByTier(lists, s).core) {
    const done = tasks.some((t) => t.listId === l.id && !t.deletedAt && t.doneAt && toKey(t.doneAt) >= from && toKey(t.doneAt) < today);
    if (!done) return `Core: ${l.name} had nothing done last week`;
  }
  return null;
}
