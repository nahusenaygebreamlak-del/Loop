// The coach's day plan (docs/13 §2.3): what is sent, checking what comes back, and applying a suggestion.
// Pure; tested in tests/coachPlan.test.ts. The coach's answer is never trusted: every rule is checked here.
import { addDays, timeToMinutes, weekdayLong, type DateKey, type TimeKey } from './dates.ts';
import { eventEnd, eventStart, eventsOn, type GEvent } from './events.ts';
import { tierOf } from './seasons.ts';
import type { DayPlan, List, PlanSuggestion, Season, Task, Tier } from '../store/types.ts';

export const MAX_SUGGESTIONS = 8;
export const MAX_PLAN_RUNS = 5;

export type Suggestion = PlanSuggestion;
export type SuggestionKind = Suggestion['kind'];
export type Plan = DayPlan;

export type PlanInput = {
  today: DateKey;
  weekday: string;
  window: { start: TimeKey; end: TimeKey };
  events: { title: string; start: TimeKey; end: TimeKey }[];
  tasks: { id: string; title: string; list?: string; tier: Tier; priority: number; due?: DateKey; start?: TimeKey; end?: TimeKey; carriedOver: number; subtasks: number }[];
};

type Busy = { start: number; end: number; taskId?: string };

/** Tasks the coach may suggest: open, in a visible list, and due today, left over, or undated in a core list. */
export function planCandidates(tasks: Task[], lists: List[], season: Season | null, today: DateKey): Task[] {
  const hidden = new Set(lists.filter((l) => l.archivedAt || l.deletedAt).map((l) => l.id));
  return tasks
    .filter((t) => !t.doneAt && !t.deletedAt && (!t.listId || !hidden.has(t.listId)))
    .filter((t) => (t.dueDate ? t.dueDate <= today : !!t.listId && tierOf(season, t.listId) === 'core'))
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || b.priority - a.priority || a.sortOrder - b.sortOrder);
}

/**
 * What is sent to the coach (docs/13 §6.3). Never task notes, tags, Notes or Inbox.
 * Returns null when there is nothing to plan.
 */
export function buildPlanInput(d: { tasks: Task[]; lists: List[]; season: Season | null; events: GEvent[]; hidden?: string[]; today: DateKey; window: { start: TimeKey; end: TimeKey } }): PlanInput | null {
  const candidates = planCandidates(d.tasks, d.lists, d.season, d.today).slice(0, 60);
  if (!candidates.length) return null;
  const listName = new Map(d.lists.map((l) => [l.id, l.name]));
  return {
    today: d.today,
    weekday: weekdayLong(d.today),
    window: d.window,
    events: eventsOn(d.events, d.today, d.hidden)
      .filter((e) => !e.allDay)
      .map((e) => ({ title: e.title, start: eventStart(e)!, end: eventEnd(e)! }))
      .sort((a, b) => a.start.localeCompare(b.start)),
    tasks: candidates.map((t) => ({
      id: t.id,
      title: t.title,
      ...(t.listId && listName.has(t.listId) ? { list: listName.get(t.listId)! } : null),
      tier: t.listId ? tierOf(d.season, t.listId) : 'support',
      priority: t.priority,
      ...(t.dueDate ? { due: t.dueDate } : null),
      // A time counts as fixed only when the task is already on today.
      ...(t.dueDate === d.today && t.startTime ? { start: t.startTime, ...(t.endTime ? { end: t.endTime } : null) } : null),
      carriedOver: t.carriedOverCount,
      subtasks: t.subtasks.filter((s) => !s.doneAt).length,
    })),
  };
}

/** Changes when the inputs change, so the plan is re-run after the leftovers are handled. */
export function planInputsHash(input: PlanInput): string {
  const text = JSON.stringify(input);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Cuts at a word boundary, so a long line never ends mid-word. */
export function trimText(v: unknown, max: number): string {
  const s = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.–-]+$/, '') + '…';
}

const overlaps = (a: Busy, b: Busy) => a.start < b.end && b.start < a.end;

/** Busy times today: Google events and tasks that already have a time. A task with no end time counts as 30 minutes. */
function busyTimes(input: PlanInput): Busy[] {
  const out: Busy[] = input.events.map((e) => ({ start: timeToMinutes(e.start), end: timeToMinutes(e.end) }));
  for (const t of input.tasks) {
    if (!t.start) continue;
    const start = timeToMinutes(t.start);
    out.push({ start, end: t.end ? timeToMinutes(t.end) : start + 30, taskId: t.id });
  }
  return out.filter((b) => b.end > b.start);
}

/**
 * Checks the coach's answer against the rules it was given (docs/13 §2.3). Anything that breaks a rule is dropped:
 * unknown tasks, a second suggestion for the same task, times outside the window or on top of an event,
 * a fixed-time task or an earlier suggestion, and dates that aren't in the future.
 * Returns null when nothing usable is left (the "couldn't plan" state).
 */
export function validatePlan(raw: unknown, input: PlanInput): Plan | null {
  const o = raw as { summary?: unknown; suggestions?: unknown } | null;
  if (!o || typeof o !== 'object' || !Array.isArray(o.suggestions)) return null;
  const known = new Map(input.tasks.map((t) => [t.id, t]));
  const from = timeToMinutes(input.window.start);
  const to = timeToMinutes(input.window.end);
  const busy = busyTimes(input);
  const seen = new Set<string>();
  const suggestions: Suggestion[] = [];

  for (const s of o.suggestions as Record<string, unknown>[]) {
    if (suggestions.length >= MAX_SUGGESTIONS) break;
    if (!s || typeof s !== 'object') continue;
    const taskId = String(s.taskId ?? '');
    const task = known.get(taskId);
    if (!task || seen.has(taskId)) continue;
    const reason = trimText(s.reason, 80);

    if (s.kind === 'schedule') {
      if (!HHMM.test(String(s.start)) || !HHMM.test(String(s.end))) continue;
      const slot: Busy = { start: timeToMinutes(String(s.start)), end: timeToMinutes(String(s.end)) };
      if (slot.end <= slot.start || slot.start < from || slot.end > to) continue;
      // The task's own current time doesn't block moving it.
      if (busy.some((b) => b.taskId !== taskId && overlaps(slot, b))) continue;
      busy.push({ ...slot, taskId });
      suggestions.push({ taskId, kind: 'schedule', start: String(s.start), end: String(s.end), reason });
    } else if (s.kind === 'today') {
      // Nothing to suggest if it's already on today.
      if (task.due === input.today) continue;
      suggestions.push({ taskId, kind: 'today', reason });
    } else if (s.kind === 'later') {
      const date = String(s.date ?? '');
      if (!DATE.test(date) || date <= input.today || date > addDays(input.today, 60)) continue;
      suggestions.push({ taskId, kind: 'later', date, reason });
    } else continue;
    seen.add(taskId);
  }
  if (!suggestions.length) return null;
  return { summary: trimText(o.summary, 140), suggestions };
}

export type TaskDates = Pick<Task, 'dueDate' | 'startTime' | 'endTime'>;

/** What accepting a suggestion changes on the task. `edited` carries a time or date the person changed first. */
export function applySuggestion(task: TaskDates, s: Suggestion, today: DateKey): { next: TaskDates; prev: TaskDates } {
  const prev: TaskDates = { dueDate: task.dueDate, startTime: task.startTime, endTime: task.endTime };
  if (s.kind === 'schedule') return { prev, next: { dueDate: today, startTime: s.start ?? null, endTime: s.end ?? null } };
  if (s.kind === 'today') return { prev, next: { dueDate: today, startTime: task.startTime, endTime: task.endTime } };
  return { prev, next: { dueDate: s.date ?? addDays(today, 1), startTime: task.startTime, endTime: task.endTime } };
}

/** Why a suggestion can no longer be accepted, or null when it still can. */
export function staleReason(task: Task | undefined): 'Deleted' | 'Already done' | null {
  if (!task || task.deletedAt) return 'Deleted';
  if (task.doneAt) return 'Already done';
  return null;
}
