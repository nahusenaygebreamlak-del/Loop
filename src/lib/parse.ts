// Quick-add parser: dates and times (chrono), #tags, !priority, ~list.
import * as chrono from 'chrono-node';
import { toKey, type DateKey, type TimeKey } from './dates.ts';

export type Priority = 0 | 1 | 2 | 3; // none, low, medium, high
export type SpanKind = 'date' | 'tag' | 'priority' | 'list';
export type Span = { start: number; end: number; kind: SpanKind };

export type ParsedQuickAdd = {
  title: string;
  date: DateKey | null;
  startTime: TimeKey | null;
  endTime: TimeKey | null;
  tags: string[];
  priority: Priority | null;
  list: string | null; // raw name after ~
  spans: Span[];
};

const PRIORITY_WORDS: Record<string, Priority> = { high: 3, h: 3, medium: 2, med: 2, m: 2, low: 1, l: 1, none: 0 };

const pad = (n: number) => String(n).padStart(2, '0');

export function parseQuickAdd(text: string, now = new Date()): ParsedQuickAdd {
  const spans: Span[] = [];
  const tags: string[] = [];
  let priority: Priority | null = null;
  let list: string | null = null;

  for (const m of text.matchAll(/(^|\s)#([\p{L}\p{N}_-]+)/gu)) {
    const start = m.index! + m[1].length;
    spans.push({ start, end: start + 1 + m[2].length, kind: 'tag' });
    const tag = m[2].toLowerCase();
    if (!tags.includes(tag)) tags.push(tag);
  }
  for (const m of text.matchAll(/(^|\s)!(high|medium|med|low|none|h|m|l)(?=\s|$)/gi)) {
    const start = m.index! + m[1].length;
    spans.push({ start, end: start + 1 + m[2].length, kind: 'priority' });
    priority = PRIORITY_WORDS[m[2].toLowerCase()];
  }
  for (const m of text.matchAll(/(^|\s)~([\p{L}\p{N}_-]+)/gu)) {
    const start = m.index! + m[1].length;
    spans.push({ start, end: start + 1 + m[2].length, kind: 'list' });
    list = m[2];
  }

  let date: DateKey | null = null;
  let startTime: TimeKey | null = null;
  let endTime: TimeKey | null = null;

  const overlaps = (s: number, e: number) => spans.some((sp) => s < sp.end && e > sp.start);
  const results = chrono.parse(text, now, { forwardDate: true });
  for (const r of results) {
    const s = r.index;
    const e = r.index + r.text.length;
    if (overlaps(s, e) || date) continue;
    // A bare number ("chapter 4") is not a date.
    if (/^\d{1,2}$/.test(r.text.trim())) continue;
    spans.push({ start: s, end: e, kind: 'date' });
    const d = r.start.date();
    date = toKey(d);
    if (r.start.isCertain('hour')) {
      startTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      if (r.end?.isCertain('hour')) {
        const ed = r.end.date();
        endTime = `${pad(ed.getHours())}:${pad(ed.getMinutes())}`;
      }
    }
  }

  spans.sort((a, b) => a.start - b.start);
  let title = '';
  let cursor = 0;
  for (const sp of spans) {
    title += text.slice(cursor, sp.start);
    cursor = sp.end;
  }
  title += text.slice(cursor);
  title = title.replace(/\s+/g, ' ').trim();

  return { title, date, startTime, endTime, tags, priority, list, spans };
}
