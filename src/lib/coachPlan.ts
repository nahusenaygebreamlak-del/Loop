// The coach's day plan (docs/13 §2.3): what is sent, checking what comes back, and applying a suggestion.
// Pure; tested in tests/coachPlan.test.ts. The coach's answer is never trusted: every rule is checked here.
import { addDays, daysBetween, formatTime, monthDay, timeRange, timeToMinutes, weekdayLong, weekdayShort, type DateKey, type TimeKey } from './dates.ts';
import { eventEnd, eventStart, eventsOn, type GEvent } from './events.ts';
import { tierOf } from './seasons.ts';
import type { DayPlan, List, PlanEdit, PlanSuggestion, PlanState, Season, Task, Tier } from '../store/types.ts';

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
  /** What the person said matters this season, from the setup (docs/13 §18). */
  brief?: string;
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
    ...(d.season?.brief ? { brief: d.season.brief } : null),
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

// ─── Showing and re-running the plan (docs/14 A5, A6) ───

/** The suggestion with any time or day the person changed before accepting it. */
export function withEdit(s: Suggestion, edit: PlanEdit | undefined): Suggestion {
  if (!edit) return s;
  if (s.kind === 'schedule' && edit.start && edit.end) return { ...s, start: edit.start, end: edit.end };
  if (s.kind === 'later' && edit.date) return { ...s, date: edit.date };
  return s;
}

/** "Thu", "tomorrow", or "Nov 20" further out. */
export function dayWord(date: DateKey, today: DateKey): string {
  const diff = daysBetween(today, date);
  if (diff === 1) return 'tomorrow';
  if (diff > 1 && diff < 7) return weekdayShort(date);
  return monthDay(date);
}

/** Line 2 of a suggestion row, before the list name: "10:00 – 11:00", "Today, any time", "Move to Thu". */
export function whenText(s: Suggestion, today: DateKey): string {
  if (s.kind === 'schedule') return timeRange(s.start ?? null, s.end ?? null);
  if (s.kind === 'today') return 'Today, any time';
  const w = dayWord(s.date ?? addDays(today, 1), today);
  return `Move to ${w === 'tomorrow' ? 'tomorrow' : w}`;
}

/** The snackbar after accepting one suggestion: "Added at 10:00", "Kept for today", "Moved to Thu". */
export function acceptedText(s: Suggestion, today: DateKey): string {
  if (s.kind === 'schedule') return `Added at ${formatTime(s.start ?? '09:00')}`;
  if (s.kind === 'today') return 'Kept for today';
  return `Moved to ${dayWord(s.date ?? addDays(today, 1), today)}`;
}

/** Screen-reader label of a row: "Write intro. Suggested 10:00 to 11:00, Work. Due today and it's high priority." */
export function suggestionLabel(title: string, s: Suggestion, today: DateKey, list?: string): string {
  const when = s.kind === 'schedule' ? `Suggested ${formatTime(s.start ?? '')} to ${formatTime(s.end ?? '')}` : s.kind === 'today' ? 'Suggested for today, any time' : `Suggested to ${whenText(s, today).toLowerCase()}`;
  return [`${title}.`, `${when}${list ? `, ${list}` : ''}.`, s.reason].filter(Boolean).join(' ');
}

/**
 * Plan again: suggestions already accepted stay as they were; the fresh plan fills in the rest
 * (docs/14 A5, "replaces any rows not yet accepted"). At most 8 in all.
 */
export function mergeReplan(old: Plan | null, state: PlanState, fresh: Plan): Plan {
  const accepted = new Set(state.accepted ?? []);
  const kept = (old?.suggestions ?? []).filter((s) => accepted.has(s.taskId));
  const added = fresh.suggestions.filter((s) => !accepted.has(s.taskId));
  return { summary: fresh.summary, suggestions: [...kept, ...added].slice(0, MAX_SUGGESTIONS) };
}

/** Suggestions still waiting for a tap: not accepted, and their task is still open. */
export function openSuggestions(plan: Plan | null, state: PlanState, tasks: Task[]): Suggestion[] {
  const accepted = new Set(state.accepted ?? []);
  return (plan?.suggestions ?? []).filter((s) => !accepted.has(s.taskId) && !staleReason(tasks.find((t) => t.id === s.taskId)));
}

export type Busy2 = { start: TimeKey; end: TimeKey; title: string };

/** For "Change time…": does the slot fit inside the window and between the day's busy times? Returns the clash or null. */
export function clashOf(start: TimeKey, end: TimeKey, busy: Busy2[], window: { start: TimeKey; end: TimeKey }): string | null {
  const a = timeToMinutes(start);
  const b = timeToMinutes(end);
  if (b <= a) return 'The end has to be after the start.';
  if (a < timeToMinutes(window.start) || b > timeToMinutes(window.end)) return `Outside ${timeRange(window.start, window.end)}.`;
  const hit = busy.find((x) => a < timeToMinutes(x.end) && timeToMinutes(x.start) < b);
  return hit ? `Clashes with ${hit.title}.` : null;
}
