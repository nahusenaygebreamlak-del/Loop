// Setting up a season with the coach (docs/13 §2.4 and §18): what you write first, up to 6 questions
// with answers to pick from, then a proposal you edit before saving. Pure; tested in tests/seasonSetup.test.ts.
import { daysBetween, fromKey, monthName, type DateKey } from './dates.ts';
import type { List, ListColor, Tier } from '../store/types.ts';

/** The first answer needs this many characters before the questions start (the more, the sharper). */
export const MIN_DUMP = 100;
/** The owner chose up to 6 follow-up questions (11 Nov 2026). */
export const MAX_QUESTIONS = 6;
const MAX_NEW_LISTS = 5;
const MAX_TASKS_PER_LIST = 3;

/** One question. `previous` holds the answer given before Back re-opened it, so it shows as picked. */
export type SetupStep = { question: string; options: string[]; answer: string | null; previous?: string };

/** The setup in progress. Kept on this device only, until it's saved or discarded. */
export type SetupDraft = {
  startDate: DateKey;
  endDate: DateKey;
  /** What they wrote first. */
  dump: string;
  /** Questions asked so far, each with its answer once given. The last one is the one on screen. */
  steps: SetupStep[];
  proposal: ProposalDraft | null;
  updatedAt: string;
};

export type ProposalRow = { ref: string; isNew: boolean; name: string; color: ListColor; tier: Tier; goal: string; keep: boolean };
export type ProposalTask = { id: string; listRef: string; title: string; date: DateKey | null; keep: boolean };
/** The coach's proposal, as the person edits it. Rows cover every live list plus any new ones. */
export type ProposalDraft = { intro: string; brief: string; rows: ProposalRow[]; tasks: ProposalTask[] };

/** "February 3, 2027" — the end date in words, as the opening question names it. */
export function dateWords(key: DateKey): string {
  const d = fromKey(key);
  return `${monthName(d.getMonth())} ${d.getDate()}, ${d.getFullYear()}`;
}

/** The fixed opening question, with the season's real end date. */
export const openingQuestion = (endDate: DateKey) => `Imagine it’s ${dateWords(endDate)}. What do you want to have happened, at work and in life?`;

/** Answered questions so far. */
export const answeredCount = (steps: SetupStep[]) => steps.filter((s) => s.answer !== null).length;

/** The setup as the coach reads it: what they wrote first, then each question and answer. */
export function chatOf(d: Pick<SetupDraft, 'dump' | 'steps'>): { from: 'coach' | 'you'; text: string }[] {
  const out: { from: 'coach' | 'you'; text: string }[] = [{ from: 'you', text: d.dump.trim() }];
  for (const s of d.steps) {
    if (s.answer === null) continue;
    out.push({ from: 'coach', text: s.question }, { from: 'you', text: s.answer });
  }
  return out;
}

/** What season_turn and season_proposal send (docs/13 §6.3): only what they typed, list names and tiers. */
export function setupInput(d: SetupDraft, lists: List[], tiers: Record<string, Tier>, today: DateKey) {
  return {
    today,
    endDate: d.endDate,
    weeks: Math.max(1, Math.ceil((daysBetween(d.startDate, d.endDate) + 1) / 7)),
    lists: live(lists).map((l) => ({ id: l.id, name: l.name, tier: tiers[l.id] ?? 'support' })),
    asked: answeredCount(d.steps),
    chat: chatOf(d),
  };
}

const live = (lists: List[]) => lists.filter((l) => !l.archivedAt && !l.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');

/** A question from the coach, or null when the answer isn't one. */
export function readQuestion(raw: unknown): { question: string; options: string[] } | null {
  const o = raw as { type?: unknown; text?: unknown; options?: unknown } | null;
  if (!o || o.type !== 'question') return null;
  const question = text(o.text, 300);
  if (!question) return null;
  const seen = new Set<string>();
  const options = (Array.isArray(o.options) ? o.options : [])
    .map((x) => text(x, 90))
    .filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()))
    .slice(0, 4);
  return { question, options };
}

const NEW_COLORS: ListColor[] = ['purple', 'pink', 'slate', 'learning', 'personal', 'work'];
const TIER_SET = new Set<Tier>(['core', 'secondary', 'support']);

/**
 * The coach's proposal, checked against the real lists (docs/13 §6.4): unknown list ids are dropped,
 * a "new" list with the name of an existing one becomes that list, task dates must sit inside the season,
 * and no list gets more than 3 first tasks. Returns null when it isn't a proposal at all.
 */
export function readProposal(raw: unknown, lists: List[], startTiers: Record<string, Tier>, season: { startDate: DateKey; endDate: DateKey }, today: DateKey): ProposalDraft | null {
  const o = raw as Record<string, unknown> | null;
  if (!o || o.type !== 'proposal' || !Array.isArray(o.tiers)) return null;
  const existing = live(lists);
  const byName = new Map(existing.map((l) => [l.name.trim().toLowerCase(), l.id]));
  const known = new Set(existing.map((l) => l.id));

  // New lists: at most 5, real names, not a copy of an existing list (that maps onto it instead).
  const alias = new Map<string, string>();
  const newRows: ProposalRow[] = [];
  const usedColors = new Set(existing.map((l) => l.color));
  const free = [...NEW_COLORS.filter((c) => !usedColors.has(c)), ...NEW_COLORS];
  for (const n of (Array.isArray(o.newLists) ? o.newLists : []) as Record<string, unknown>[]) {
    const tempId = text(n?.tempId, 40);
    const name = text(n?.name, 40);
    if (!tempId || !name || known.has(tempId)) continue;
    const same = byName.get(name.toLowerCase());
    if (same) {
      alias.set(tempId, same);
      continue;
    }
    if (newRows.length >= MAX_NEW_LISTS || newRows.some((r) => r.ref === tempId || r.name.toLowerCase() === name.toLowerCase())) continue;
    newRows.push({ ref: tempId, isNew: true, name, color: free[newRows.length % free.length], tier: TIER_SET.has(n.tier as Tier) ? (n.tier as Tier) : 'support', goal: '', keep: true });
  }
  const ref = (r: unknown): string | null => {
    const id = text(r, 64);
    const mapped = alias.get(id) ?? id;
    return known.has(mapped) || newRows.some((n) => n.ref === mapped) ? mapped : null;
  };

  const tiers = new Map<string, Tier>();
  for (const t of o.tiers as Record<string, unknown>[]) {
    const id = ref(t?.listId);
    if (id && TIER_SET.has(t.tier as Tier)) tiers.set(id, t.tier as Tier);
  }
  const goals = new Map<string, string>();
  for (const g of (Array.isArray(o.goals) ? o.goals : []) as Record<string, unknown>[]) {
    const id = ref(g?.listRef);
    const line = text(g?.goal, 80);
    if (id && line && !goals.has(id)) goals.set(id, line);
  }

  const rows: ProposalRow[] = [
    ...existing.map((l) => ({ ref: l.id, isNew: false, name: l.name, color: l.color, tier: tiers.get(l.id) ?? startTiers[l.id] ?? 'support', goal: goals.get(l.id) ?? '', keep: true })),
    ...newRows.map((r) => ({ ...r, tier: tiers.get(r.ref) ?? r.tier, goal: goals.get(r.ref) ?? '' })),
  ];

  const perList = new Map<string, number>();
  const tasks: ProposalTask[] = [];
  for (const t of (Array.isArray(o.tasks) ? o.tasks : []) as Record<string, unknown>[]) {
    const listRef = ref(t?.listRef);
    const title = text(t?.title, 120);
    if (!listRef || !title || tasks.length >= 15) continue;
    const n = perList.get(listRef) ?? 0;
    if (n >= MAX_TASKS_PER_LIST) continue;
    perList.set(listRef, n + 1);
    const date = typeof t.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && t.date >= today && t.date >= season.startDate && t.date <= season.endDate ? t.date : null;
    tasks.push({ id: `task${tasks.length + 1}`, listRef, title, date, keep: true });
  }
  return { intro: text(o.intro, 200), brief: typeof o.brief === 'string' ? o.brief.trim().slice(0, 600) : '', rows, tasks };
}

/** Goals are the kept rows with a goal line or a Core / Secondary tier, core first. */
export function goalRows(p: ProposalDraft): ProposalRow[] {
  const rank: Record<Tier, number> = { core: 0, secondary: 1, support: 2 };
  return p.rows.filter((r) => r.keep && (r.goal.trim() || r.tier !== 'support')).sort((a, b) => rank[a.tier] - rank[b.tier]);
}

/** Support: everything else that's kept (existing lists, and new support lists like "Personal admin"). */
export const supportRows = (p: ProposalDraft) => p.rows.filter((r) => r.keep && !r.goal.trim() && r.tier === 'support');

/** Tasks that will be created: kept, with a non-empty title, on a list that's kept. */
export function keptTasks(p: ProposalDraft): ProposalTask[] {
  const kept = new Set(p.rows.filter((r) => r.keep).map((r) => r.ref));
  return p.tasks.filter((t) => t.keep && t.title.trim() && kept.has(t.listRef));
}

/** "1 new list, 6 tasks" for the Save button and the snackbar; empty when it only sets tiers. */
export function countLine(p: ProposalDraft): string {
  const lists = p.rows.filter((r) => r.isNew && r.keep && r.name.trim()).length;
  const tasks = keptTasks(p).length;
  return [lists ? `${lists} new list${lists === 1 ? '' : 's'}` : null, tasks ? `${tasks} task${tasks === 1 ? '' : 's'}` : null].filter(Boolean).join(', ');
}

/** What Save season hands the store (addSeasonFromProposal). Removed rows are left out; removed goals go back to Support. */
export function saveInput(d: Pick<SetupDraft, 'startDate' | 'endDate'>, p: ProposalDraft, name: string | null) {
  const kept = p.rows.filter((r) => r.keep && (!r.isNew || r.name.trim()));
  return {
    name,
    startDate: d.startDate,
    endDate: d.endDate,
    brief: p.brief.trim() || null,
    newLists: kept.filter((r) => r.isNew).map((r) => ({ tempId: r.ref, name: r.name.trim(), color: r.color })),
    tiers: Object.fromEntries(kept.map((r) => [r.ref, r.tier])),
    goals: Object.fromEntries(kept.filter((r) => r.goal.trim()).map((r) => [r.ref, r.goal.trim()])),
    tasks: keptTasks(p).map((t) => ({ listRef: t.listRef, title: t.title.trim(), date: t.date })),
  };
}

/**
 * Back: from the question on screen, re-open the one before with its answer still shown as picked.
 * From the first question there's nothing before it, so it returns no steps (the opening question shows).
 */
export function stepBack(steps: SetupStep[]): SetupStep[] {
  const rest = steps.length && steps[steps.length - 1].answer === null ? steps.slice(0, -1) : steps;
  if (!rest.length) return [];
  const last = rest[rest.length - 1];
  return [...rest.slice(0, -1), { ...last, answer: null, previous: last.answer ?? last.previous }];
}

/** Picks or types an answer for the question on screen. */
export function answer(steps: SetupStep[], value: string): SetupStep[] {
  const v = value.trim();
  if (!steps.length || !v) return steps;
  const { previous: _p, ...last } = steps[steps.length - 1];
  void _p;
  return [...steps.slice(0, -1), { ...last, answer: v }];
}

/** Fraction done for the progress bar: answered questions out of the most there can be. */
export const progressOf = (steps: SetupStep[]) => Math.min(1, answeredCount(steps) / MAX_QUESTIONS);
