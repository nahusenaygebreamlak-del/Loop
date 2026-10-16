import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listGroups, listRowSub, timelineSub, todayView } from '../src/lib/taskViews.ts';
import type { List, Tag, Task } from '../src/store/types.ts';

const TODAY = '2026-10-16';
let n = 0;
const task = (p: Partial<Task>): Task => ({
  id: `t${n++}`,
  listId: 'work',
  title: 'x',
  notes: '',
  dueDate: null,
  startTime: null,
  endTime: null,
  priority: 0,
  reminderMinutes: null,
  repeatRule: null,
  carriedOverCount: 0,
  sortOrder: n,
  tagIds: [],
  subtasks: [],
  doneAt: null,
  deletedAt: null,
  createdAt: '',
  updatedAt: '',
  ...p,
});
const lists: List[] = [{ id: 'work', name: 'Work', color: 'work', sortOrder: 0, archivedAt: null, deletedAt: null, createdAt: '', updatedAt: '' }];
const tags: Tag[] = [{ id: 'g1', name: 'design', createdAt: '' }];

test('Today: timeline in time order, current item, overdue and deleted hidden', () => {
  const tasks = [
    task({ id: 'b', dueDate: TODAY, startTime: '14:00' }),
    task({ id: 'a', dueDate: TODAY, startTime: '10:00', endTime: '11:00' }),
    task({ id: 'c', dueDate: TODAY }),
    task({ id: 'old', dueDate: '2026-10-15' }),
    task({ id: 'gone', dueDate: TODAY, deletedAt: 'x' }),
  ];
  const v = todayView(tasks, TODAY, '10:30');
  assert.deepEqual(v.schedule.map((t) => t.id), ['a', 'b']);
  assert.deepEqual(v.anytime.map((t) => t.id), ['c']);
  assert.equal(v.currentId, 'a');
  assert.equal(todayView(tasks, TODAY, '12:00').currentId, null);
  assert.equal(timelineSub(v.schedule[0], lists), '10:00 – 11:00 · Work');
});

test('List groups match VProject', () => {
  const tasks = [
    task({ id: 'over', dueDate: '2026-10-15' }),
    task({ id: 'now', dueDate: TODAY, startTime: '10:00', endTime: '11:00', subtasks: [{ id: 's', title: '', doneAt: 'x', sortOrder: 0 }, { id: 's2', title: '', doneAt: null, sortOrder: 1 }, { id: 's3', title: '', doneAt: null, sortOrder: 2 }] }),
    task({ id: 'soon', dueDate: '2026-10-20', tagIds: ['g1'] }),
    task({ id: 'none', tagIds: ['g1'] }),
    task({ id: 'done', dueDate: TODAY, doneAt: 'x' }),
  ];
  const groups = listGroups(tasks, 'work', TODAY);
  assert.deepEqual(groups.map((g) => g.label), ['Overdue', 'Today', 'Next 7 days', 'No date']);
  assert.equal(listRowSub(tasks[0], tags, TODAY), 'Yesterday');
  assert.equal(listRowSub(tasks[1], tags, TODAY), '10:00 – 11:00 · 1 of 3 subtasks');
  assert.equal(listRowSub(tasks[2], tags, TODAY), 'Tue, Oct 20 · #design');
  assert.equal(listRowSub(tasks[3], tags, TODAY), '#design');
  // A just-ticked task stays visible until the screen is left.
  assert.equal(listGroups(tasks, 'work', TODAY, new Set(['done']))[1].tasks.length, 2);
});
