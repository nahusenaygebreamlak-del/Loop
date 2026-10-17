import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eventDay, eventDays, eventStart, eventsOn, type GEvent } from '../src/lib/events.ts';

const ev = (p: Partial<GEvent>): GEvent => ({ id: 'e', calendarId: 'c', calendarName: 'Me', title: 'Team sync', start: '2026-10-16T11:00:00', end: '2026-10-16T11:30:00', allDay: false, location: null, description: null, attendees: [], link: null, ...p });

test('timed events land on their local day and time', () => {
  const e = ev({});
  assert.equal(eventDay(e), '2026-10-16');
  assert.equal(eventStart(e), '11:00');
});

test('all-day events cover each day up to (not including) their end date', () => {
  assert.deepEqual(eventDays(ev({ allDay: true, start: '2026-10-16', end: '2026-10-18' })), ['2026-10-16', '2026-10-17']);
});

test('hidden events are left out; all-day first', () => {
  const list = eventsOn([ev({ id: 'a' }), ev({ id: 'b', allDay: true, start: '2026-10-16', end: '2026-10-17' }), ev({ id: 'c' })], '2026-10-16', ['c']);
  assert.deepEqual(list.map((e) => e.id), ['b', 'a']);
});
