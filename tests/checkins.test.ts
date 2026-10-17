import assert from 'node:assert/strict';
import { test } from 'node:test';
import { afternoonContent, applyChoices, leftovers, morningContent, nameList, planCheckins, sortContent, summarize } from '../src/lib/checkins.ts';
import type { InboxItem, List, Task } from '../src/store/types.ts';

const FRI = '2026-10-16';
let n = 0;
const task = (p: Partial<Task>): Task => ({
  id: `t${n++}`, listId: null, title: 'x', notes: '', dueDate: null, startTime: null, endTime: null, priority: 0, reminderMinutes: null,
  repeatRule: null, carriedOverCount: 0, carriedAt: null, sortOrder: n, tagIds: [], subtasks: [], doneAt: null, deletedAt: null, createdAt: '', updatedAt: '', ...p,
});
const lists: List[] = [];
const S = { morningTime: '08:30', afternoonTime: '14:00', sortTime: '18:00', weekends: false, remindUntilAct: false };
const inboxItem = (text: string): InboxItem => ({ id: text, text, sortedAt: null, sortedOutcome: null, sortedRefId: null, deletedAt: null, createdAt: '2026-10-16T08:00:00Z', updatedAt: '' });

test('morning with leftovers matches VCheckInNotification', () => {
  const tasks = [
    task({ title: 'Draft Q4 project plan', dueDate: '2026-10-15' }),
    task({ title: 'Renew website domain', dueDate: '2026-10-15' }),
    task({ title: 'Reply to recruiter email', dueDate: '2026-10-15' }),
    task({ title: 'Update portfolio case study', dueDate: '2026-10-15' }),
    task({ title: 'Done already', dueDate: '2026-10-15', doneAt: 'x' }),
  ];
  assert.equal(leftovers(tasks, lists, FRI).length, 4);
  assert.deepEqual(morningContent(tasks, lists, FRI), {
    title: '4 tasks left from yesterday',
    body: 'Draft Q4 project plan, Renew website domain and 2 more. What should we do with them?',
    category: 'leftovers',
  });
  assert.equal(morningContent([task({ title: 'A', dueDate: '2026-10-13' })], lists, FRI).title, '1 task left over');
});

test('plain morning lists the plan (NMorningPlain)', () => {
  const tasks = [
    task({ title: 'Read chapter 4', dueDate: FRI }),
    task({ title: 'Send invoice to client', dueDate: FRI, startTime: '14:00' }),
    task({ title: 'Review onboarding wireframes', dueDate: FRI, startTime: '10:00' }),
    task({ title: 'Call bank', dueDate: FRI }),
  ];
  const c = morningContent(tasks, lists, FRI);
  assert.equal(c.title, 'Today: 4 tasks');
  assert.equal(c.body, '10:00  Review onboarding wireframes\n14:00  Send invoice to client\nRead chapter 4\nand 1 more');
});

test('afternoon only when something is open; Inbox only when it has notes', () => {
  assert.equal(afternoonContent([task({ dueDate: FRI, doneAt: 'x' })], lists, FRI), null);
  const a = afternoonContent([task({ title: 'Send invoice to client', dueDate: FRI }), task({ title: 'Read chapter 4', dueDate: FRI }), task({ title: 'Call bank about card', dueDate: FRI })], lists, FRI);
  assert.equal(a?.title, 'Halfway there: 3 still open');
  assert.equal(a?.body, 'Send invoice to client, Read chapter 4 and Call bank about card.');
  assert.equal(sortContent([]), null);
  assert.equal(sortContent(['a', 'b', 'c', 'd', 'e'].map(inboxItem))?.title, '5 notes in your Inbox');
  assert.equal(nameList(['A', 'B', 'C', 'D', 'E']), 'A, B and 3 more');
});

test('planning: weekends skipped, past times skipped, remind until I act', () => {
  const now = new Date(2026, 9, 16, 9, 0); // Friday 09:00
  const data = { tasks: [task({ title: 'Late', dueDate: '2026-10-15' }), task({ title: 'Now', dueDate: FRI })], lists, inbox: [inboxItem('note')] };
  const plan = planCheckins(data, S, now, FRI);
  // Friday: morning passed; afternoon and sort remain. Sat/Sun skipped.
  assert.deepEqual(plan.map((p) => p.id), ['afternoon-2026-10-16', 'sort-2026-10-16']);
  const weekend = planCheckins(data, { ...S, weekends: true }, now, FRI);
  assert.ok(weekend.some((p) => p.id === 'morning-2026-10-17'));
  const early = planCheckins(data, { ...S, remindUntilAct: true }, new Date(2026, 9, 16, 7, 0), FRI);
  assert.deepEqual(early.filter((p) => p.kind === 'morning').map((p) => p.id), ['morning-2026-10-16', 'morning-2026-10-16-r1', 'morning-2026-10-16-r2', 'morning-2026-10-16-r3', 'morning-2026-10-16-r4']);
  assert.equal(planCheckins(data, { ...S, morningTime: null }, new Date(2026, 9, 16, 7, 0), FRI).some((p) => p.kind === 'morning'), false);
});

test('check-in choices and the summary (VCheckInReschedule, NAfterCheckin)', () => {
  const a = task({ id: 'a', dueDate: '2026-10-15', carriedOverCount: 1 });
  const b = task({ id: 'b', dueDate: '2026-10-15' });
  const c = task({ id: 'c', dueDate: '2026-10-14' });
  const d = task({ id: 'd', dueDate: '2026-10-15' });
  const { next, prev } = applyChoices([a, b, c, d], { a: 'today', b: 'today', c: 'nextWeek', d: 'done' }, FRI, 'now');
  assert.deepEqual(next.find((x) => x.id === 'a'), { id: 'a', dueDate: FRI, doneAt: null, carriedOverCount: 2, carriedAt: FRI });
  assert.equal(next.find((x) => x.id === 'c')?.dueDate, '2026-10-19');
  assert.equal(prev.find((x) => x.id === 'a')?.dueDate, '2026-10-15');
  assert.deepEqual(summarize(next, FRI, () => 'Monday'), { title: '2 moved to today, 1 to Monday', sub: '1 marked done' });
});
