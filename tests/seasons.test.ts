import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeSeason, cleanTiers, coreNote, currentSeason, dateProblem, daysLeft, endFor, groupByTier, pastSeasons, seasonName, tierOf, totalWeeks, weekLine, weekNumber, weekShort } from '../src/lib/seasons.ts';
import type { List, Season, Task } from '../src/store/types.ts';

const season = (p: Partial<Season> = {}): Season => ({ id: 's1', name: null, startDate: '2026-10-27', endDate: '2027-01-18', endedAt: null, tiers: {}, createdAt: '2026-10-27T08:00:00.000Z', updatedAt: '', ...p });
const list = (id: string, extra: Partial<List> = {}): List => ({ id, name: id, color: 'work', sortOrder: 0, sortBy: 'date', showDone: false, archivedAt: null, deletedAt: null, createdAt: '', updatedAt: '', ...extra });
const done = (listId: string, day: string): Task => ({ id: `${listId}-${day}`, listId, title: 'x', notes: '', dueDate: null, startTime: null, endTime: null, priority: 0, reminderMinutes: null, repeatRule: null, carriedOverCount: 0, carriedAt: null, sortOrder: 0, tagIds: [], subtasks: [], doneAt: `${day}T10:00:00.000Z`, deletedAt: null, createdAt: '', updatedAt: '' });
const key = (iso: string) => iso.slice(0, 10);

test('a 12-week season starting Tue 27 Oct ends Mon 18 Jan', () => {
  assert.equal(endFor('2026-10-27'), '2027-01-18');
  assert.equal(totalWeeks(season()), 12);
});

test('week numbers count from the start date and stay inside 1…N', () => {
  const s = season();
  assert.equal(weekNumber(s, '2026-10-27'), 1);
  assert.equal(weekNumber(s, '2026-11-02'), 1);
  assert.equal(weekNumber(s, '2026-11-03'), 2);
  assert.equal(weekNumber(s, '2026-11-10'), 3);
  assert.equal(weekNumber(s, '2027-01-18'), 12);
  assert.equal(weekNumber(s, '2027-03-01'), 12);
  assert.equal(weekNumber(s, '2026-10-01'), 1);
  assert.equal(weekLine(s, '2026-11-10'), 'Week 3 of 12');
  assert.equal(weekShort(s, '2026-11-10'), 'Wk 3/12');
});

test('a custom length rounds the number of weeks up', () => {
  assert.equal(totalWeeks({ startDate: '2026-11-01', endDate: '2026-11-10' }), 2);
  assert.equal(totalWeeks({ startDate: '2026-11-01', endDate: '2026-11-01' }), 1);
});

test('days left counts today, and is 0 once it is over', () => {
  assert.equal(daysLeft(season(), '2027-01-18'), 1);
  assert.equal(daysLeft(season(), '2027-01-17'), 2);
  assert.equal(daysLeft(season(), '2027-01-19'), 0);
});

test('only one season is active: inside its dates and not ended early', () => {
  const a = season();
  assert.equal(activeSeason([a], '2026-10-26'), null);
  assert.equal(activeSeason([a], '2026-10-27')?.id, 's1');
  assert.equal(activeSeason([a], '2027-01-18')?.id, 's1');
  assert.equal(activeSeason([a], '2027-01-19'), null);
  assert.equal(activeSeason([season({ endedAt: '2026-11-01T00:00:00.000Z' })], '2026-11-10'), null);
});

test('the current season is the active one, else the next one waiting to start', () => {
  const old = season({ id: 'old', startDate: '2026-07-01', endDate: '2026-09-01' });
  const next = season({ id: 'next', startDate: '2027-01-19', endDate: '2027-04-12' });
  assert.equal(currentSeason([old, next, season()], '2026-11-10')?.id, 's1');
  assert.equal(currentSeason([old, next], '2026-11-10')?.id, 'next');
  assert.equal(currentSeason([old], '2026-11-10'), null);
  assert.deepEqual(pastSeasons([old, next, season()], '2026-11-10').map((s) => s.id), ['old']);
});

test('unnamed seasons are numbered in the order they started', () => {
  const a = season({ id: 'a', startDate: '2026-07-01', endDate: '2026-09-01' });
  const b = season({ id: 'b' });
  const c = season({ id: 'c', name: '  Autumn push ' });
  assert.equal(seasonName(a, [b, a]), 'Season 1');
  assert.equal(seasonName(b, [b, a]), 'Season 2');
  assert.equal(seasonName(c, [c]), 'Autumn push');
});

test('a list with no tier is Support; archived and deleted lists are left out', () => {
  const s = season({ tiers: { work: 'core', learn: 'secondary', gone: 'core' } });
  assert.equal(tierOf(s, 'work'), 'core');
  assert.equal(tierOf(s, 'home'), 'support');
  assert.equal(tierOf(null, 'work'), 'support');
  const g = groupByTier([list('home', { sortOrder: 2 }), list('work'), list('learn'), list('admin', { sortOrder: 1 }), list('gone', { deletedAt: 'x' }), list('old', { archivedAt: 'x' })], s);
  assert.deepEqual(g.core.map((l) => l.id), ['work']);
  assert.deepEqual(g.secondary.map((l) => l.id), ['learn']);
  assert.deepEqual(g.support.map((l) => l.id), ['admin', 'home']);
});

test('saved tiers drop deleted lists and plain Support', () => {
  assert.deepEqual(cleanTiers({ work: 'core', home: 'support', gone: 'secondary' }, [list('work'), list('home'), list('gone', { deletedAt: 'x' })]), { work: 'core' });
});

test('dates: end after start, not already over, and no running into another season', () => {
  const s = season();
  assert.equal(dateProblem([], '2026-11-10', '2026-11-09', '2026-11-10'), 'The end date is before the start date.');
  assert.equal(dateProblem([], '2026-09-01', '2026-10-01', '2026-11-10'), 'These dates are already over.');
  assert.match(dateProblem([s], '2026-12-01', '2027-02-01', '2026-11-10') ?? '', /another season/);
  assert.equal(dateProblem([s], '2027-01-19', '2027-04-12', '2026-11-10'), null);
  assert.equal(dateProblem([s], '2026-10-27', '2027-02-01', '2026-11-10', 's1'), null, 'editing a season ignores itself');
  assert.equal(dateProblem([season({ endedAt: '2026-11-01T00:00:00.000Z' })], '2026-11-10', '2027-02-01', '2026-11-10'), null, 'an ended season is out of the way');
});

test('the season note names the first core list with nothing done in the last 7 days', () => {
  const s = season({ tiers: { work: 'core', learn: 'core' } });
  const lists = [list('work'), list('learn', { name: 'Learning', sortOrder: 1 })];
  assert.equal(coreNote(s, lists, [done('work', '2026-11-05')], '2026-11-10', key), 'Core: Learning had nothing done last week');
  assert.equal(coreNote(s, lists, [done('work', '2026-11-05'), done('learn', '2026-11-09')], '2026-11-10', key), null);
  assert.equal(coreNote(s, lists, [done('work', '2026-11-05'), done('learn', '2026-11-02')], '2026-11-10', key), 'Core: Learning had nothing done last week', 'older than 7 days does not count');
  assert.equal(coreNote(s, lists, [], '2026-10-30', key), null, 'no note in the first week');
  assert.equal(coreNote(season(), lists, [], '2026-11-10', key), null, 'no core lists, no note');
});
