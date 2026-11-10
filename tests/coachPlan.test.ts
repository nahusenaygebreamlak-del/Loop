import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acceptedText, applySuggestion, buildPlanInput, clashOf, mergeReplan, openSuggestions, planCandidates, planInputsHash, staleReason, suggestionLabel, trimText, validatePlan, whenText, withEdit, type PlanInput } from '../src/lib/coachPlan.ts';
import type { GEvent } from '../src/lib/events.ts';
import type { List, Season, Task } from '../src/store/types.ts';

const TODAY = '2026-11-10';
let n = 0;
const task = (p: Partial<Task>): Task => ({ id: `t${n++}`, listId: 'work', title: 'x', notes: 'private notes', dueDate: null, startTime: null, endTime: null, priority: 0, reminderMinutes: null, repeatRule: null, carriedOverCount: 0, carriedAt: null, sortOrder: n, tagIds: ['tag'], subtasks: [], doneAt: null, deletedAt: null, createdAt: '', updatedAt: '', ...p });
const list = (id: string, extra: Partial<List> = {}): List => ({ id, name: id[0].toUpperCase() + id.slice(1), color: 'work', sortOrder: 0, sortBy: 'date', showDone: false, archivedAt: null, deletedAt: null, createdAt: '', updatedAt: '', ...extra });
const season: Season = { id: 's', name: null, startDate: '2026-10-27', endDate: '2027-01-18', endedAt: null, tiers: { work: 'core' }, createdAt: '', updatedAt: '' };
const lists = [list('work'), list('home'), list('old', { archivedAt: 'x' })];
const at = (h: number, m = 0) => new Date(2026, 10, 10, h, m).toISOString();
const event = (title: string, start: string, end: string, allDay = false): GEvent => ({ id: title, calendarId: 'c', calendarName: 'Cal', title, start, end, allDay, location: 'Room 4', description: 'agenda', attendees: ['Sam'], link: null });

test('candidates: due today, left over, or undated in a core list; never done, deleted or hidden', () => {
  const tasks = [
    task({ id: 'today', dueDate: TODAY }),
    task({ id: 'late', dueDate: '2026-11-08', listId: 'home' }),
    task({ id: 'core-undated' }),
    task({ id: 'home-undated', listId: 'home' }),
    task({ id: 'future', dueDate: '2026-11-12' }),
    task({ id: 'done', dueDate: TODAY, doneAt: 'x' }),
    task({ id: 'binned', dueDate: TODAY, deletedAt: 'x' }),
    task({ id: 'archived', dueDate: TODAY, listId: 'old' }),
  ];
  assert.deepEqual(planCandidates(tasks, lists, season, TODAY).map((t) => t.id), ['late', 'today', 'core-undated']);
  assert.deepEqual(planCandidates(tasks, lists, null, TODAY).map((t) => t.id), ['late', 'today'], 'no season: no core lists');
});

test('what is sent: titles, lists, tiers and times; never notes, tags, locations or attendees', () => {
  const tasks = [task({ id: 'a', title: 'Write intro', dueDate: TODAY, startTime: '10:00', endTime: '11:00', priority: 3, carriedOverCount: 2, subtasks: [{ id: 's', title: 'x', doneAt: null, sortOrder: 0 }] }), task({ id: 'b', title: 'Call bank', dueDate: '2026-11-09', startTime: '15:00', listId: 'home' })];
  const events = [event('Standup', at(9, 30), at(10)), event('Holiday', '2026-11-10', '2026-11-11', true), event('Tomorrow', new Date(2026, 10, 11, 9).toISOString(), new Date(2026, 10, 11, 10).toISOString())];
  const input = buildPlanInput({ tasks, lists, season, events, today: TODAY, window: { start: '09:00', end: '18:00' } })!;
  assert.equal(input.weekday, 'Tuesday');
  assert.deepEqual(input.events, [{ title: 'Standup', start: '09:30', end: '10:00' }]);
  assert.deepEqual(input.tasks[0], { id: 'b', title: 'Call bank', list: 'Home', tier: 'support', priority: 0, due: '2026-11-09', carriedOver: 0, subtasks: 0 }, 'a leftover\'s old time is not a fixed time today');
  assert.deepEqual(input.tasks[1], { id: 'a', title: 'Write intro', list: 'Work', tier: 'core', priority: 3, due: TODAY, start: '10:00', end: '11:00', carriedOver: 2, subtasks: 1 });
  const sent = JSON.stringify(input);
  for (const secret of ['private notes', 'tag', 'Room 4', 'agenda', 'Sam']) assert.ok(!sent.includes(secret), `${secret} must not be sent`);
  assert.equal(buildPlanInput({ tasks: [], lists, season, events, today: TODAY, window: { start: '09:00', end: '18:00' } }), null, 'nothing to plan');
});

test('the inputs hash changes when the inputs change', () => {
  const base = { tasks: [task({ id: 'a', dueDate: TODAY })], lists, season, events: [], today: TODAY, window: { start: '09:00', end: '18:00' } };
  const h = planInputsHash(buildPlanInput(base)!);
  assert.equal(planInputsHash(buildPlanInput(base)!), h);
  assert.notEqual(planInputsHash(buildPlanInput({ ...base, tasks: [...base.tasks, task({ id: 'b', dueDate: TODAY })] })!), h);
});

const input: PlanInput = {
  today: TODAY,
  weekday: 'Tuesday',
  window: { start: '09:00', end: '18:00' },
  events: [{ title: 'Standup', start: '09:30', end: '10:00' }],
  tasks: [
    { id: 'a', title: 'Write intro', tier: 'core', priority: 3, due: TODAY, carriedOver: 0, subtasks: 0 },
    { id: 'b', title: 'Fixed', tier: 'support', priority: 0, due: TODAY, start: '14:00', end: '15:00', carriedOver: 0, subtasks: 0 },
    { id: 'c', title: 'Late', tier: 'support', priority: 0, due: '2026-11-08', carriedOver: 2, subtasks: 0 },
    { id: 'd', title: 'Undated', tier: 'core', priority: 0, carriedOver: 0, subtasks: 0 },
  ],
};
const plan = (suggestions: unknown[], summary = 'A light day.') => validatePlan({ summary, suggestions }, input);

test('a good plan passes through', () => {
  const p = plan([
    { taskId: 'a', kind: 'schedule', start: '10:00', end: '11:00', reason: 'Due today and high priority.' },
    { taskId: 'c', kind: 'today', reason: 'Carried over twice.' },
    { taskId: 'd', kind: 'later', date: '2026-11-11', reason: 'The day is full.' },
  ]);
  assert.equal(p?.summary, 'A light day.');
  assert.deepEqual(p?.suggestions.map((s) => [s.taskId, s.kind]), [['a', 'schedule'], ['c', 'today'], ['d', 'later']]);
});

test('broken suggestions are dropped: unknown task, repeats, bad times, outside the window, overlaps, past dates', () => {
  const p = plan([
    { taskId: 'zzz', kind: 'schedule', start: '10:00', end: '11:00', reason: 'unknown task' },
    { taskId: 'a', kind: 'schedule', start: '09:45', end: '10:30', reason: 'on top of Standup' },
    { taskId: 'a', kind: 'schedule', start: '08:00', end: '09:00', reason: 'before the window' },
    { taskId: 'a', kind: 'schedule', start: '17:30', end: '18:30', reason: 'after the window' },
    { taskId: 'a', kind: 'schedule', start: '11:00', end: '10:00', reason: 'ends before it starts' },
    { taskId: 'a', kind: 'schedule', start: '10am', end: '11am', reason: 'not a time' },
    { taskId: 'a', kind: 'schedule', start: '14:30', end: '15:30', reason: 'on top of the fixed task' },
    { taskId: 'a', kind: 'schedule', start: '10:00', end: '11:00', reason: 'fine' },
    { taskId: 'a', kind: 'today', reason: 'second suggestion for the same task' },
    { taskId: 'c', kind: 'schedule', start: '10:30', end: '11:30', reason: 'on top of the suggestion above' },
    { taskId: 'c', kind: 'later', date: TODAY, reason: 'not in the future' },
    { taskId: 'c', kind: 'later', date: 'tomorrow', reason: 'not a date' },
    { taskId: 'c', kind: 'dance', reason: 'unknown kind' },
    { taskId: 'b', kind: 'today', reason: 'already on today' },
    null,
  ]);
  assert.deepEqual(p?.suggestions, [{ taskId: 'a', kind: 'schedule', start: '10:00', end: '11:00', reason: 'fine' }]);
});

test('a fixed-time task can be moved to a new time; its old slot does not block it', () => {
  assert.deepEqual(plan([{ taskId: 'b', kind: 'schedule', start: '14:30', end: '15:30', reason: 'After lunch.' }])?.suggestions[0].start, '14:30');
});

test('at most 8 suggestions; nothing usable means no plan', () => {
  const many: PlanInput = { ...input, events: [], tasks: Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, title: 'x', tier: 'support' as const, priority: 0, due: '2026-11-09', carriedOver: 0, subtasks: 0 })) };
  const p = validatePlan({ summary: 's', suggestions: many.tasks.map((t) => ({ taskId: t.id, kind: 'today', reason: 'r' })) }, many);
  assert.equal(p?.suggestions.length, 8);
  assert.equal(plan([{ taskId: 'zzz', kind: 'today', reason: 'x' }]), null);
  assert.equal(plan([]), null);
  assert.equal(validatePlan('not json', input), null);
  assert.equal(validatePlan({ summary: 'x' }, input), null);
});

test('long text is cut at a word, with an ellipsis', () => {
  const long = 'This reason goes on for much longer than the eighty characters that a single suggestion row can show';
  const out = trimText(long, 80);
  assert.ok(out.length <= 80 && out.endsWith('…') && !out.includes('  '));
  assert.ok(long.startsWith(out.slice(0, -1)));
  assert.equal(trimText('  Short  one. ', 80), 'Short one.');
  assert.equal(trimText(42, 80), '');
  assert.ok((plan([{ taskId: 'c', kind: 'today', reason: long }], long + long)?.summary.length ?? 999) <= 140);
});

test('accepting a suggestion: what changes, and what Undo puts back', () => {
  const t = { dueDate: '2026-11-08', startTime: '15:00', endTime: null };
  assert.deepEqual(applySuggestion(t, { taskId: 'x', kind: 'schedule', start: '10:00', end: '11:00', reason: '' }, TODAY), { prev: t, next: { dueDate: TODAY, startTime: '10:00', endTime: '11:00' } });
  assert.deepEqual(applySuggestion(t, { taskId: 'x', kind: 'today', reason: '' }, TODAY).next, { dueDate: TODAY, startTime: '15:00', endTime: null });
  assert.deepEqual(applySuggestion(t, { taskId: 'x', kind: 'later', date: '2026-11-12', reason: '' }, TODAY).next, { dueDate: '2026-11-12', startTime: '15:00', endTime: null });
});

test('a suggestion goes stale when its task is done or deleted meanwhile', () => {
  assert.equal(staleReason(task({})), null);
  assert.equal(staleReason(task({ doneAt: 'x' })), 'Already done');
  assert.equal(staleReason(task({ deletedAt: 'x' })), 'Deleted');
  assert.equal(staleReason(undefined), 'Deleted');
});

test('row wording: when, the snackbar after accepting, and the screen-reader label', () => {
  const sch = { taskId: 'a', kind: 'schedule' as const, start: '10:00', end: '11:00', reason: 'Due today and it is high priority.' };
  const tod = { taskId: 'b', kind: 'today' as const, reason: 'Short.' };
  const thu = { taskId: 'c', kind: 'later' as const, date: '2026-11-12', reason: 'The day is full.' };
  const tmw = { taskId: 'd', kind: 'later' as const, date: '2026-11-11', reason: '' };
  assert.equal(whenText(sch, TODAY), '10:00 – 11:00');
  assert.equal(whenText(tod, TODAY), 'Today, any time');
  assert.equal(whenText(thu, TODAY), 'Move to Thu');
  assert.equal(whenText(tmw, TODAY), 'Move to tomorrow');
  assert.equal(acceptedText(sch, TODAY), 'Added at 10:00');
  assert.equal(acceptedText(tod, TODAY), 'Kept for today');
  assert.equal(acceptedText(thu, TODAY), 'Moved to Thu');
  assert.equal(suggestionLabel('Write intro', sch, TODAY, 'Work'), 'Write intro. Suggested 10:00 to 11:00, Work. Due today and it is high priority.');
});

test('a changed time or day replaces the suggested one; other kinds ignore it', () => {
  const sch = { taskId: 'a', kind: 'schedule' as const, start: '10:00', end: '11:00', reason: '' };
  assert.deepEqual(withEdit(sch, { start: '14:00', end: '14:30' }), { ...sch, start: '14:00', end: '14:30' });
  assert.deepEqual(withEdit(sch, { date: '2026-11-12' }), sch);
  const later = { taskId: 'b', kind: 'later' as const, date: '2026-11-11', reason: '' };
  assert.deepEqual(withEdit(later, { date: '2026-11-13' }), { ...later, date: '2026-11-13' });
  assert.equal(withEdit(later, undefined), later);
});

test('plan again keeps accepted rows and fills the rest from the fresh plan, 8 at most', () => {
  const old = { summary: 'old', suggestions: [{ taskId: 'a', kind: 'today' as const, reason: 'kept' }, { taskId: 'b', kind: 'today' as const, reason: 'replaced' }] };
  const fresh = { summary: 'new', suggestions: [{ taskId: 'a', kind: 'schedule' as const, start: '09:00', end: '10:00', reason: 'dup' }, ...Array.from({ length: 8 }, (_, i) => ({ taskId: `n${i}`, kind: 'today' as const, reason: 'fresh' }))] };
  const merged = mergeReplan(old, { accepted: ['a'] }, fresh);
  assert.equal(merged.summary, 'new');
  assert.equal(merged.suggestions.length, 8);
  assert.deepEqual(merged.suggestions[0], old.suggestions[0]);
  assert.ok(!merged.suggestions.some((s) => s.taskId === 'b'));
});

test('open suggestions leave out accepted ones and tasks done or deleted since', () => {
  const plan = { summary: '', suggestions: ['a', 'b', 'c', 'd'].map((taskId) => ({ taskId, kind: 'today' as const, reason: '' })) };
  const tasks = [task({ id: 'a' }), task({ id: 'b', doneAt: 'x' }), task({ id: 'c' })];
  assert.deepEqual(openSuggestions(plan, { accepted: ['c'] }, tasks).map((s) => s.taskId), ['a']);
});

test('change time: must sit inside the window and miss the day\'s busy times', () => {
  const win = { start: '09:00', end: '18:00' };
  const busy = [{ start: '10:00', end: '11:00', title: 'Standup' }];
  assert.equal(clashOf('11:00', '12:00', busy, win), null);
  assert.equal(clashOf('10:30', '11:30', busy, win), 'Clashes with Standup.');
  assert.equal(clashOf('08:00', '09:00', busy, win), 'Outside 09:00 – 18:00.');
  assert.equal(clashOf('12:00', '12:00', busy, win), 'The end has to be after the start.');
});
