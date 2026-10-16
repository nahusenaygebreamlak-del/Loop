import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, longDate, monthGrid, nextMonday, relativeDay, shortDate, weekOf } from '../src/lib/dates.ts';
import { parseQuickAdd } from '../src/lib/parse.ts';
import { describeRule, formatRule, nextOccurrence, parseRule } from '../src/lib/repeat.ts';

// Friday, October 16 2026, 09:00
const NOW = new Date(2026, 9, 16, 9, 0);

test('date formatting matches the designs', () => {
  assert.equal(longDate('2026-10-16'), 'Friday, October 16');
  assert.equal(shortDate('2026-10-20'), 'Tue, Oct 20');
  assert.equal(relativeDay('2026-10-15', '2026-10-16'), 'Yesterday');
  assert.equal(relativeDay('2026-10-17', '2026-10-16'), 'Tomorrow');
});

test('week strip and month grid', () => {
  assert.deepEqual(weekOf('2026-10-16', 0), ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17']);
  const grid = monthGrid(2026, 9, 0);
  assert.equal(grid[0].key, '2026-09-27'); // matches NDatePicker: 27 28 29 30 then Oct 1
  assert.equal(grid.filter((c) => !c.inMonth).length, 4);
  assert.equal(nextMonday('2026-10-16'), '2026-10-19');
  assert.equal(nextMonday('2026-10-19'), '2026-10-26');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
});

test('quick add: the design example', () => {
  const p = parseQuickAdd('Call bank tomorrow 3pm #personal !high', NOW);
  assert.equal(p.title, 'Call bank');
  assert.equal(p.date, '2026-10-17');
  assert.equal(p.startTime, '15:00');
  assert.deepEqual(p.tags, ['personal']);
  assert.equal(p.priority, 3);
  assert.deepEqual(p.spans.map((s) => s.kind), ['date', 'tag', 'priority']);
});

test('quick add: no date or list goes to Inbox', () => {
  const p = parseQuickAdd('Look into a standing desk', NOW);
  assert.equal(p.title, 'Look into a standing desk');
  assert.equal(p.date, null);
  assert.equal(p.list, null);
});

test('quick add: bare numbers are not dates', () => {
  const p = parseQuickAdd('Read chapter 4', NOW);
  assert.equal(p.date, null);
  assert.equal(p.title, 'Read chapter 4');
});

test('quick add: other date forms', () => {
  assert.equal(parseQuickAdd('Gym mon', NOW).date, '2026-10-19');
  assert.equal(parseQuickAdd('Dentist oct 20', NOW).date, '2026-10-20');
  const t = parseQuickAdd('Sort inbox 18:00', NOW);
  assert.equal(t.date, '2026-10-16');
  assert.equal(t.startTime, '18:00');
  const r = parseQuickAdd('Workshop tomorrow 10:00-11:30 ~work', NOW);
  assert.equal(r.startTime, '10:00');
  assert.equal(r.endTime, '11:30');
  assert.equal(r.list, 'work');
  assert.equal(r.title, 'Workshop');
});

test('repeat rules', () => {
  const weekly = formatRule({ freq: 'weekly', days: [5] });
  assert.equal(weekly, 'FREQ=WEEKLY;BYDAY=FR');
  assert.deepEqual(parseRule(weekly), { freq: 'weekly', days: [5] });
  assert.equal(describeRule(weekly, '2026-10-20'), 'Every Friday, starting Oct 23');
  assert.equal(nextOccurrence(weekly, '2026-10-23'), '2026-10-30');
  assert.equal(nextOccurrence('FREQ=MONTHLY', '2026-01-31'), '2026-02-28');
  assert.equal(nextOccurrence('FREQ=DAILY', '2026-10-16'), '2026-10-17');
  assert.equal(nextOccurrence(null, '2026-10-16'), null);
});
