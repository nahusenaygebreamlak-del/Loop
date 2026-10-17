import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diff, fromRow, matchListsByName, profileToSettings, settingsToProfile, toRow } from '../src/sync/mapping.ts';
import type { List, Task } from '../src/store/types.ts';

const task: Task = {
  id: 't1', listId: 'l1', title: 'Call bank', notes: '', dueDate: '2026-10-17', startTime: '15:00', endTime: null, priority: 3,
  reminderMinutes: 15, repeatRule: 'FREQ=WEEKLY;BYDAY=FR', carriedOverCount: 0, sortOrder: 2, tagIds: ['g1'],
  subtasks: [{ id: 's1', title: 'Find card', doneAt: null, sortOrder: 0 }], doneAt: null, deletedAt: null,
  createdAt: '2026-10-16T21:00:00.000Z', updatedAt: '2026-10-16T21:00:00.000Z',
};
const list = (id: string, name: string, extra: Partial<List> = {}): List => ({
  id, name, color: 'work', sortOrder: 0, sortBy: 'date', showDone: false, archivedAt: null, deletedAt: null, createdAt: '', updatedAt: '', ...extra,
});

test('task row round trip (Postgres time and timestamp formats)', () => {
  const row = toRow('tasks', task, 'u1');
  assert.equal(row.user_id, 'u1');
  assert.equal(row.list_id, 'l1');
  assert.ok(!('updated_at' in row), 'the server sets updated_at');
  const back = fromRow('tasks', { ...row, start_time: '15:00:00', created_at: '2026-10-16 21:00:00+00', updated_at: '2026-10-16T21:05:00+00:00' }) as Task;
  assert.equal(back.startTime, '15:00');
  assert.equal(back.createdAt, task.createdAt);
  assert.equal(back.updatedAt, '2026-10-16T21:05:00.000Z');
  assert.deepEqual({ ...back, updatedAt: task.updatedAt }, task);
});

test('diff finds edits, additions and removals by object identity', () => {
  const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' };
  const b2 = { id: 'b' };
  assert.deepEqual(diff([a, b, c], [a, b2, { id: 'd' }]), { changed: ['b', 'd'], removed: ['c'] });
  assert.deepEqual(diff([a], [a]), { changed: [], removed: [] });
});

test('first sign-in folds local default lists into the account lists', () => {
  const local = [list('loc-work', 'Work'), list('loc-side', 'Side project')];
  const remote = [list('srv-work', 'work'), list('srv-old', 'Side project', { deletedAt: 'x' })];
  assert.deepEqual([...matchListsByName(local, remote)], [['loc-work', 'srv-work']]);
});

test('settings ⇄ profile, with check-ins turned off', () => {
  const s = { theme: 'dark' as const, weekStart: 1 as const, timeFormat: '12h' as const, morningTime: null, afternoonTime: '14:00', sortTime: '18:00', fullScreen: true, weekends: false };
  assert.deepEqual(profileToSettings({ ...settingsToProfile(s), afternoon_time: '14:00:00', sort_time: '18:00:00' }), s);
});
