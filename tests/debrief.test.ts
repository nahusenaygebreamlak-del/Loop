import assert from 'node:assert/strict';
import { test } from 'node:test';
import { answeredDays, cardLine, closingAnswers, endedSeasonToShow, isAnswered, showDebriefItem, yesterdayRange, yesterdaySummary } from '../src/lib/debrief.ts';
import { planCheckins } from '../src/lib/checkins.ts';
import type { Debrief, Season, Task } from '../src/store/types.ts';

const key = (iso: string) => iso.slice(0, 10);
let n = 0;
const task = (p: Partial<Task>): Task => ({ id: `t${n++}`, listId: null, title: 'x', notes: '', dueDate: null, startTime: null, endTime: null, priority: 0, reminderMinutes: null, repeatRule: null, carriedOverCount: 0, carriedAt: null, sortOrder: n, tagIds: [], subtasks: [], doneAt: null, deletedAt: null, createdAt: '', updatedAt: '', ...p });
const debrief = (day: string, p: Partial<Debrief> = {}): Debrief => ({ id: `d${n++}`, day, openedAt: null, answeredAt: null, leftoversAction: null, plan: null, planRuns: 0, planState: {}, createdAt: '', updatedAt: '', ...p });
const season = (p: Partial<Season>): Season => ({ id: 's', name: null, startDate: '2026-08-01', endDate: '2026-10-23', endedAt: null, tiers: {}, createdAt: '', updatedAt: '', ...p });

test('yesterday is one day, or the whole weekend back to Friday when weekends are off', () => {
  // 2026-11-10 is a Tuesday, 2026-11-09 a Monday, 2026-11-08 a Sunday.
  assert.deepEqual(yesterdayRange('2026-11-10', false), { from: '2026-11-09', to: '2026-11-09', label: 'Yesterday' });
  assert.deepEqual(yesterdayRange('2026-11-09', false), { from: '2026-11-06', to: '2026-11-08', label: 'Since Friday' });
  assert.deepEqual(yesterdayRange('2026-11-09', true), { from: '2026-11-08', to: '2026-11-08', label: 'Yesterday' });
  assert.deepEqual(yesterdayRange('2026-11-08', false), { from: '2026-11-06', to: '2026-11-07', label: 'Since Friday' });
});

test('yesterday summary: count, newest three titles, how many more; deleted tasks left out', () => {
  const r = yesterdayRange('2026-11-09', false);
  const tasks = [
    task({ title: 'A', doneAt: '2026-11-06T09:00:00.000Z' }),
    task({ title: 'B', doneAt: '2026-11-07T09:00:00.000Z' }),
    task({ title: 'C', doneAt: '2026-11-08T09:00:00.000Z' }),
    task({ title: 'D', doneAt: '2026-11-08T12:00:00.000Z' }),
    task({ title: 'old', doneAt: '2026-11-05T09:00:00.000Z' }),
    task({ title: 'today', doneAt: '2026-11-09T07:00:00.000Z' }),
    task({ title: 'binned', doneAt: '2026-11-08T09:00:00.000Z', deletedAt: 'x' }),
    task({ title: 'open' }),
  ];
  const y = yesterdaySummary(tasks, r, key);
  assert.equal(y.count, 4);
  assert.deepEqual(y.titles, ['D', 'C', 'B']);
  assert.equal(y.more, 1);
  assert.equal(y.line, '4 tasks finished');
  assert.equal(yesterdaySummary([task({ title: 'A', doneAt: '2026-11-08T09:00:00.000Z' })], r, key).line, '1 task finished');
  assert.equal(yesterdaySummary([], r, key).line, 'Nothing ticked off yesterday. That’s fine.');
});

test('a day is answered when any device answered it', () => {
  const rows = [debrief('2026-11-10'), debrief('2026-11-10', { answeredAt: '2026-11-10T08:40:00.000Z' }), debrief('2026-11-09')];
  assert.equal(isAnswered(rows, '2026-11-10'), true);
  assert.equal(isAnswered(rows, '2026-11-09'), false);
  assert.equal(isAnswered(rows, '2026-11-11'), false);
  assert.deepEqual([...answeredDays(rows)], ['2026-11-10']);
});

test('closing answers only a quiet morning, and only after a 2-second look', () => {
  assert.equal(closingAnswers(false, 0, 2000), true);
  assert.equal(closingAnswers(false, 0, 1500), false);
  assert.equal(closingAnswers(true, 0, 60_000), false, 'untouched leftovers: reminders keep going');
});

test('the Debrief menu item shows until answered or noon', () => {
  const at = (h: number) => new Date(2026, 10, 10, h, 0);
  assert.equal(showDebriefItem([], '2026-11-10', at(8)), true);
  assert.equal(showDebriefItem([], '2026-11-10', at(12)), false);
  assert.equal(showDebriefItem([debrief('2026-11-10', { answeredAt: 'x' })], '2026-11-10', at(8)), false);
  assert.equal(showDebriefItem([debrief('2026-11-10', { openedAt: 'x' })], '2026-11-10', at(8)), true, 'opened is not answered');
});

test('the season-ended card: from the day after the end date, until dismissed or a new season exists', () => {
  const s = season({});
  assert.equal(endedSeasonToShow([s], '2026-10-23', []), null, 'still running on its last day');
  assert.equal(endedSeasonToShow([s], '2026-10-24', [])?.id, 's');
  assert.equal(endedSeasonToShow([s], '2026-11-10', [])?.id, 's');
  assert.equal(endedSeasonToShow([s], '2026-11-10', ['s']), null, 'Not now hides it for good');
  assert.equal(endedSeasonToShow([season({ endedAt: '2026-09-01T00:00:00.000Z' })], '2026-11-10', []), null, 'ended by hand: no card');
  assert.equal(endedSeasonToShow([s, season({ id: 'next', startDate: '2026-11-01', endDate: '2027-01-23' })], '2026-11-10', []), null);
  assert.equal(endedSeasonToShow([s, season({ id: 'soon', startDate: '2026-12-01', endDate: '2027-02-22' })], '2026-11-10', []), null);
});

test('the Today card line', () => {
  const tue = yesterdayRange('2026-11-10', false);
  const mon = yesterdayRange('2026-11-09', false);
  const y = (count: number) => ({ count, titles: [], more: 0, line: '' });
  assert.equal(cardLine(3, y(4), tue), '3 left over · 4 finished yesterday');
  assert.equal(cardLine(0, y(2), mon), 'Nothing left over · 2 finished since friday');
  assert.equal(cardLine(0, y(0), tue), 'Nothing left over · nothing ticked off yesterday');
});

test('"Remind until I act" stops for a day once its debrief is answered', () => {
  const tasks = [task({ title: 'Late', dueDate: '2026-11-09' })];
  const settings = { morningTime: '08:30', afternoonTime: null, sortTime: null, weekends: false, remindUntilAct: true };
  const now = new Date(2026, 10, 10, 8, 0);
  const ids = (answered?: Set<string>) => planCheckins({ tasks, lists: [], inbox: [] }, settings, now, '2026-11-10', 1, answered).map((p) => p.id);
  assert.deepEqual(ids(), ['morning-2026-11-10', 'morning-2026-11-10-r1', 'morning-2026-11-10-r2', 'morning-2026-11-10-r3', 'morning-2026-11-10-r4']);
  assert.deepEqual(ids(new Set(['2026-11-10'])), ['morning-2026-11-10']);
});
