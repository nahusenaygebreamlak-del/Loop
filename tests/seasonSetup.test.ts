import assert from 'node:assert/strict';
import { test } from 'node:test';
import { answer, chatOf, countLine, dateWords, goalRows, keptTasks, openingQuestion, progressOf, readProposal, readQuestion, saveInput, setupInput, stepBack, supportRows, type SetupStep } from '../src/lib/seasonSetup.ts';
import type { List } from '../src/store/types.ts';

const list = (id: string, name: string, extra: Partial<List> = {}): List => ({ id, name, color: 'work', sortOrder: 0, sortBy: 'date', showDone: false, archivedAt: null, deletedAt: null, createdAt: '', updatedAt: '', ...extra });
const lists = [list('work', 'Afriwork', { sortOrder: 0 }), list('home', 'Personal', { color: 'personal', sortOrder: 1 }), list('old', 'Old', { archivedAt: 'x' })];
const TODAY = '2026-11-11';
const season = { startDate: '2026-11-11', endDate: '2027-02-02' };

test('the opening question names the end date in words', () => {
  assert.equal(dateWords('2027-02-03'), 'February 3, 2027');
  assert.equal(openingQuestion('2027-02-03'), 'Imagine it’s February 3, 2027. What do you want to have happened, at work and in life?');
});

test('what is sent: the opening answer, answered questions, live list names and tiers, nothing else', () => {
  const steps: SetupStep[] = [
    { question: 'Which comes first?', options: ['Kash', 'Afriwork'], answer: 'Kash' },
    { question: 'What is a win?', options: [], answer: null },
  ];
  const input = setupInput({ startDate: '2026-11-11', endDate: '2027-02-02', dump: '  Launch Kash. ', steps, proposal: null, updatedAt: '' }, lists, { work: 'core' }, TODAY);
  assert.deepEqual(input, {
    today: TODAY,
    endDate: '2027-02-02',
    weeks: 12,
    lists: [
      { id: 'work', name: 'Afriwork', tier: 'core' },
      { id: 'home', name: 'Personal', tier: 'support' },
    ],
    asked: 1,
    chat: [
      { from: 'you', text: 'Launch Kash.' },
      { from: 'coach', text: 'Which comes first?' },
      { from: 'you', text: 'Kash' },
    ],
  });
  assert.equal(chatOf({ dump: 'x', steps: [] }).length, 1);
});

test('a question: text plus up to 4 distinct answers; anything else is not a question', () => {
  assert.deepEqual(readQuestion({ type: 'question', text: ' Which one comes first? ', options: ['Kash', 'kash', '', 'Afriwork', 'Sleep', 'More', 'Extra'] }), { question: 'Which one comes first?', options: ['Kash', 'Afriwork', 'Sleep', 'More'] });
  assert.deepEqual(readQuestion({ type: 'question', text: 'No options?' }), { question: 'No options?', options: [] });
  assert.equal(readQuestion({ type: 'proposal', tiers: [] }), null);
  assert.equal(readQuestion({ type: 'question', text: '  ' }), null);
});

test('back re-opens the question before with its answer shown; from the first question it goes to the opening', () => {
  const two: SetupStep[] = [
    { question: 'Q1', options: [], answer: 'A1' },
    { question: 'Q2', options: [], answer: null },
  ];
  assert.deepEqual(stepBack(two), [{ question: 'Q1', options: [], answer: null, previous: 'A1' }]);
  assert.deepEqual(stepBack([{ question: 'Q1', options: [], answer: null }]), []);
  // Waiting for the next question after answering: back re-opens the one just answered.
  assert.deepEqual(stepBack([{ question: 'Q1', options: [], answer: 'A1' }]), [{ question: 'Q1', options: [], answer: null, previous: 'A1' }]);
  assert.deepEqual(answer(stepBack(two), ' B1 '), [{ question: 'Q1', options: [], answer: 'B1' }]);
  assert.equal(progressOf([{ question: 'Q1', options: [], answer: 'A1' }, { question: 'Q2', options: [], answer: 'A2' }, { question: 'Q3', options: [], answer: null }]), 2 / 6);
});

const raw = {
  type: 'proposal',
  intro: 'Kash comes first; Afriwork keeps running.',
  tiers: [
    { listId: 'work', tier: 'secondary' },
    { listId: 'new1', tier: 'core' },
    { listId: 'ghost', tier: 'core' },
    { listId: 'old', tier: 'core' },
  ],
  newLists: [
    { tempId: 'new1', name: 'Kash', tier: 'core' },
    { tempId: 'new2', name: 'personal', tier: 'support' },
    { tempId: 'new3', name: 'Personal admin', tier: 'support' },
  ],
  goals: [
    { listRef: 'new1', goal: 'Live on the Play Store by Feb 3' },
    { listRef: 'work', goal: 'Take on one bigger responsibility' },
    { listRef: 'ghost', goal: 'Nope' },
  ],
  tasks: [
    { listRef: 'new1', title: 'List what is left before launch' },
    { listRef: 'new1', title: 'Fix the login crash', date: '2026-11-12' },
    { listRef: 'new1', title: 'Write the store listing', date: '2027-05-01' },
    { listRef: 'new1', title: 'A fourth task' },
    { listRef: 'new2', title: 'Pay the rent' },
    { listRef: 'ghost', title: 'Lost' },
  ],
  brief: 'Kash first, about 10 hours a week, evenings and one weekend day.',
};

test('a proposal is checked against the real lists', () => {
  const p = readProposal(raw, lists, {}, season, TODAY)!;
  assert.equal(p.intro, 'Kash comes first; Afriwork keeps running.');
  // Archived lists and unknown ids are left out; "personal" is the existing Personal list, not a new one.
  assert.deepEqual(
    p.rows.map((r) => [r.ref, r.isNew, r.name, r.tier, r.goal]),
    [
      ['work', false, 'Afriwork', 'secondary', 'Take on one bigger responsibility'],
      ['home', false, 'Personal', 'support', ''],
      ['new1', true, 'Kash', 'core', 'Live on the Play Store by Feb 3'],
      ['new3', true, 'Personal admin', 'support', ''],
    ],
  );
  // New lists get colours the existing lists don't use.
  assert.ok(!['work', 'personal'].includes(p.rows[2].color));
  // At most 3 tasks a list; a date outside the season is dropped; tasks for "new2" land on Personal.
  assert.deepEqual(
    p.tasks.map((t) => [t.listRef, t.title, t.date]),
    [
      ['new1', 'List what is left before launch', null],
      ['new1', 'Fix the login crash', '2026-11-12'],
      ['new1', 'Write the store listing', null],
      ['home', 'Pay the rent', null],
    ],
  );
  assert.equal(readProposal({ type: 'question', text: 'x' }, lists, {}, season, TODAY), null);
});

test('goals, support, the count line and what gets saved follow the edits', () => {
  const p = readProposal(raw, lists, {}, season, TODAY)!;
  assert.deepEqual(goalRows(p).map((r) => r.name), ['Kash', 'Afriwork']);
  assert.deepEqual(supportRows(p).map((r) => r.name), ['Personal', 'Personal admin']);
  assert.equal(countLine(p), '2 new lists, 4 tasks');

  // Remove the new support list, untick one task, rename the new core list, clear Afriwork's goal.
  const edited = {
    ...p,
    rows: p.rows.map((r) => (r.ref === 'new3' ? { ...r, keep: false } : r.ref === 'new1' ? { ...r, name: ' Kash app ' } : r.ref === 'work' ? { ...r, goal: ' ' } : r)),
    tasks: p.tasks.map((t) => (t.title === 'Pay the rent' ? { ...t, keep: false } : t)),
  };
  assert.equal(countLine(edited), '1 new list, 3 tasks');
  assert.deepEqual(saveInput(season, edited, null), {
    name: null,
    startDate: '2026-11-11',
    endDate: '2027-02-02',
    brief: 'Kash first, about 10 hours a week, evenings and one weekend day.',
    newLists: [{ tempId: 'new1', name: 'Kash app', color: p.rows[2].color }],
    tiers: { work: 'secondary', home: 'support', new1: 'core' },
    goals: { new1: 'Live on the Play Store by Feb 3' },
    tasks: [
      { listRef: 'new1', title: 'List what is left before launch', date: null },
      { listRef: 'new1', title: 'Fix the login crash', date: '2026-11-12' },
      { listRef: 'new1', title: 'Write the store listing', date: null },
    ],
  });
  // Tasks on a removed list go with it.
  assert.equal(keptTasks({ ...edited, rows: edited.rows.map((r) => (r.ref === 'new1' ? { ...r, keep: false } : r)) }).length, 0);
});
