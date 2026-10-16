import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addedLine, checklistCount, endOfWeek, inboxOpen, isEmptyNote, notePreview, notesList, sortEstimate, sortedToday, sortSummary, stampShort } from '../src/lib/inboxViews.ts';
import type { InboxItem, Note } from '../src/store/types.ts';

const TODAY = '2026-10-16'; // Friday
const local = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi).toISOString();
const item = (p: Partial<InboxItem>): InboxItem => ({ id: 'i', text: 'x', sortedAt: null, sortedOutcome: null, sortedRefId: null, deletedAt: null, createdAt: local(2026, 10, 16, 9), updatedAt: '', ...p });
const note = (p: Partial<Note>): Note => ({ id: 'n', title: '', body: [], pinned: false, fromInbox: false, deletedAt: null, createdAt: '', updatedAt: local(2026, 10, 16, 9), ...p });

test('Inbox list and times match VInbox', () => {
  const items = [item({ id: 'old', createdAt: local(2026, 10, 14, 21, 15) }), item({ id: 'new', createdAt: local(2026, 10, 16, 9, 12) }), item({ id: 'done', sortedAt: 'x' })];
  assert.deepEqual(inboxOpen(items).map((i) => i.id), ['new', 'old']);
  assert.equal(stampShort(local(2026, 10, 16, 9, 12), TODAY), 'Today, 09:12');
  assert.equal(stampShort(local(2026, 10, 15, 20), TODAY), 'Yesterday');
  assert.equal(stampShort(local(2026, 10, 14, 20), TODAY), 'Wed');
  assert.equal(addedLine(local(2026, 10, 15, 19, 40), TODAY), 'Added yesterday, 19:40');
  assert.equal(addedLine(local(2026, 10, 14, 21, 15), TODAY), 'Added Wednesday, 21:15');
  assert.equal(sortEstimate(7), 'About 2 minutes');
  assert.equal(sortEstimate(1), 'About 1 minute');
});

test('Sorted today and summary (NAllSorted)', () => {
  const items = [
    item({ id: 'a', sortedAt: local(2026, 10, 16, 10), sortedOutcome: 'task' }),
    item({ id: 'b', sortedAt: local(2026, 10, 16, 9), sortedOutcome: 'note' }),
    item({ id: 'c', sortedAt: local(2026, 10, 16, 11), sortedOutcome: 'deleted' }),
    item({ id: 'y', sortedAt: local(2026, 10, 15, 11), sortedOutcome: 'task' }),
  ];
  const today = sortedToday(items, TODAY);
  assert.deepEqual(today.map((i) => i.id), ['b', 'a', 'c']);
  assert.deepEqual(sortSummary(today), { tasks: 1, notes: 1, deleted: 1 });
});

test('This week = end of the week', () => {
  assert.equal(endOfWeek(TODAY, 0), '2026-10-17'); // Saturday
  assert.equal(endOfWeek(TODAY, 1), '2026-10-18'); // Sunday
  assert.equal(endOfWeek('2026-10-17', 0), '2026-10-17');
});

test('Notes list, preview and checklist count (NNotes)', () => {
  const n = note({
    title: 'Packing list',
    body: [
      { id: '1', type: 'text', text: 'Leaving Thursday.' },
      { id: '2', type: 'checklist', text: 'Charger', done: false },
      { id: '3', type: 'checklist', text: 'Tickets printed', done: true },
    ],
  });
  assert.equal(notePreview(n), 'Leaving Thursday. ☐ Charger, ☑ Tickets printed');
  assert.equal(checklistCount(n), '1 of 2 checked');
  const list = notesList([note({ id: 'a', updatedAt: '2' }), note({ id: 'p', pinned: true, updatedAt: '1' }), note({ id: 'b', updatedAt: '3' }), note({ id: 'gone', deletedAt: 'x' })]);
  assert.deepEqual(list.map((x) => x.id), ['p', 'b', 'a']);
  assert.equal(isEmptyNote(note({ body: [{ id: '1', type: 'text', text: '  ' }] })), true);
});
