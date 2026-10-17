import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planTaskReminders } from '../src/lib/reminders.ts';
import type { Task } from '../src/store/types.ts';

const DAY = '2026-10-17';
const task = (p: Partial<Task>): Task =>
  ({ id: 'a', title: 'Call mom', listId: null, dueDate: DAY, startTime: '16:30', endTime: null, reminderMinutes: 0, priority: 0, tagIds: [], subtasks: [], notes: '', repeatRule: null, doneAt: null, deletedAt: null, carriedOverCount: 0, carriedAt: null, sortOrder: 0, createdAt: '', updatedAt: '', ...p }) as Task;

test('reminder at the start fires at the start time', () => {
  const r = planTaskReminders([task({})], [], new Date(2026, 9, 17, 16, 27), DAY);
  assert.equal(r.length, 1);
  assert.equal(r[0].at.getHours(), 16);
  assert.equal(r[0].at.getMinutes(), 30);
});

test('15 min before, and past reminders are skipped', () => {
  const r = planTaskReminders([task({ reminderMinutes: 15 })], [], new Date(2026, 9, 17, 16, 0), DAY);
  assert.equal(r[0].at.getMinutes(), 15);
  assert.equal(planTaskReminders([task({ startTime: '04:30' })], [], new Date(2026, 9, 17, 16, 27), DAY).length, 0);
});

test('untimed tasks remind at 09:00; done and no-reminder tasks are skipped', () => {
  const r = planTaskReminders([task({ startTime: null, dueDate: '2026-10-18' }), task({ id: 'b', doneAt: 'x' }), task({ id: 'c', reminderMinutes: null })], [], new Date(2026, 9, 17, 16, 0), DAY);
  assert.equal(r.length, 1);
  assert.equal(r[0].at.getHours(), 9);
});
