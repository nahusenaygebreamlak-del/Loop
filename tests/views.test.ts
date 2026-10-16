import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allTasksGroups, completedGroups, daysLeft, highlightParts, listGroups, listRowSub, next7View, search, tagGroups, timelineSub, todayView, trashEntries, visibleTasks } from '../src/lib/taskViews.ts';
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
const lists: List[] = [{ id: 'work', name: 'Work', color: 'work', sortOrder: 0, sortBy: 'date', showDone: false, archivedAt: null, deletedAt: null, createdAt: '', updatedAt: '' }];
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

test('Next 7 Days: seven days from today, empty days kept', () => {
  const tasks = [task({ id: 'a', dueDate: TODAY }), task({ id: 'b', dueDate: '2026-10-19' }), task({ id: 'x', dueDate: '2026-10-30' })];
  const days = next7View(tasks, TODAY);
  assert.equal(days.length, 7);
  assert.equal(days[0].tasks[0].id, 'a');
  assert.equal(days[3].key, '2026-10-19');
  assert.equal(days[3].tasks[0].id, 'b');
  assert.equal(days[1].tasks.length, 0);
});

test('Archived lists hide their tasks; All tasks groups', () => {
  const archived: List = { ...lists[0], id: 'old', name: 'Old', archivedAt: 'x' };
  const tasks = [task({ id: 'w', listId: 'work', dueDate: TODAY }), task({ id: 'o', listId: 'old' }), task({ id: 'n', listId: null, dueDate: '2026-10-15', priority: 3 })];
  const vis = visibleTasks(tasks, [...lists, archived]);
  assert.deepEqual(vis.map((t) => t.id), ['w', 'n']);
  assert.deepEqual(allTasksGroups(vis, lists, 'list', TODAY).map((g) => g.label), ['Work', 'No list']);
  assert.deepEqual(allTasksGroups(vis, lists, 'date', TODAY).map((g) => g.label), ['Overdue', 'Today']);
  assert.deepEqual(allTasksGroups(vis, lists, 'priority', TODAY).map((g) => g.label), ['High', 'None']);
});

test('Tag view and Completed', () => {
  const tasks = [task({ id: 'a', tagIds: ['g1'], dueDate: TODAY }), task({ id: 'b', tagIds: ['g1'] }), task({ id: 'c', tagIds: [] })];
  assert.deepEqual(tagGroups(tasks, 'g1', TODAY).map((g) => g.label), ['Today', 'No date']);
  const done = [task({ id: 'd1', doneAt: '2026-10-16T09:40:00' }), task({ id: 'd2', doneAt: '2026-10-15T16:20:00' }), task({ id: 'd3', doneAt: '2026-10-16T08:55:00' })];
  const groups = completedGroups(done, 'all', (iso) => iso.slice(0, 10));
  assert.deepEqual(groups.map((g) => [g.key, g.tasks.map((t) => t.id)]), [['2026-10-16', ['d1', 'd3']], ['2026-10-15', ['d2']]]);
});

test('Trash: days left and entries', () => {
  const now = new Date('2026-10-16T12:00:00Z');
  assert.equal(daysLeft('2026-10-16T11:00:00Z', now), 30);
  assert.equal(daysLeft('2026-09-18T12:00:00Z', now), 2);
  const entries = trashEntries([task({ id: 't', title: 'Order cards', deletedAt: '2026-10-10T00:00:00Z' })], [{ id: 'i', text: 'wifi', deletedAt: '2026-10-12T00:00:00Z' }], []);
  assert.deepEqual(entries.map((e) => e.kind), ['inbox', 'task']);
});

test('Search with highlighting', () => {
  const tasks = [task({ id: 's', title: 'Send invoice to client' }), task({ id: 'd', title: 'Check invoice paid', doneAt: 'x' }), task({ id: 'z', title: 'Other' })];
  const r = search('invoice', { tasks, lists, tags: [], inbox: [{ id: 'i', text: 'New invoice template', deletedAt: null, sortedAt: null, createdAt: '' }], notes: [] });
  assert.deepEqual(r.tasks.map((t) => t.id), ['s', 'd']);
  assert.equal(r.notes.length, 1);
  assert.deepEqual(highlightParts('Send invoice to client', 'invoice'), [{ t: 'Send ', hit: false }, { t: 'invoice', hit: true }, { t: ' to client', hit: false }]);
});
