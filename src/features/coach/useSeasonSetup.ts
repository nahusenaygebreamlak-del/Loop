import { router } from 'expo-router';
import { create } from 'zustand';
import { pushSnack } from '@/components/Snackbar';
import { addDays, todayKey } from '@/lib/dates';
import { answer, answeredCount, MAX_QUESTIONS, readProposal, readQuestion, saveInput, setupInput, stepBack, countLine, type ProposalDraft, type SetupDraft } from '@/lib/seasonSetup';
import { currentSeason, dateProblem, endFor, pastSeasons } from '@/lib/seasons';
import { useLocal } from '@/store/local';
import { useStore } from '@/store/store';
import type { Tier } from '@/store/types';
import { coachCall, type CoachFailure } from './api';

// Setting up a season with the coach (docs/13 §2.4, §18). The draft lives in useLocal, so it
// survives leaving and coming back; nothing reaches the server until Save season.

type Run = { status: 'idle' | 'asking' | 'proposing' | 'failed'; reason: CoachFailure | null };
export const useSetupRun = create<Run>(() => ({ status: 'idle', reason: null }));

const getDraft = () => useLocal.getState().seasonSetup ?? null;
const putDraft = (patch: Partial<SetupDraft>) => {
  const d = getDraft();
  if (d) useLocal.setState({ seasonSetup: { ...d, ...patch, updatedAt: new Date().toISOString() } });
};

/** The tiers the setup starts from: the current or last season's (docs/13 §2.1). */
function startTiers(): Record<string, Tier> {
  const { seasons } = useStore.getState();
  const today = todayKey();
  return (currentSeason(seasons, today) ?? pastSeasons(seasons, today)[0])?.tiers ?? {};
}

/** A fresh draft: starts today, or the day after the current season ends; 12 weeks. */
export function startSetup(): SetupDraft {
  const existing = getDraft();
  if (existing) return existing;
  const today = todayKey();
  const cur = currentSeason(useStore.getState().seasons, today);
  const startDate = cur ? addDays(cur.endDate, 1) : today;
  const draft: SetupDraft = { startDate, endDate: endFor(startDate), dump: '', steps: [], proposal: null, updatedAt: new Date().toISOString() };
  useLocal.setState({ seasonSetup: draft });
  useSetupRun.setState({ status: 'idle', reason: null });
  return draft;
}

export const setDump = (dump: string) => putDraft({ dump });
export const setDates = (d: { startDate: string; endDate: string }) => putDraft(d);
export const setProposal = (proposal: ProposalDraft) => putDraft({ proposal });

/** Asks the next question, or for the proposal once 6 are answered (or the coach says it knows enough). */
export async function askNext(): Promise<void> {
  const d = getDraft();
  if (!d || useSetupRun.getState().status === 'asking' || useSetupRun.getState().status === 'proposing') return;
  if (answeredCount(d.steps) >= MAX_QUESTIONS) return makePlan();
  useSetupRun.setState({ status: 'asking', reason: null });
  const { lists } = useStore.getState();
  const res = await coachCall<unknown>('season_turn', setupInput(d, lists, startTiers(), todayKey()));
  // The person may have gone back or discarded while waiting.
  const now = getDraft();
  if (!now || now.steps !== d.steps || now.proposal) return useSetupRun.setState({ status: 'idle', reason: null });
  if (!res.ok) return useSetupRun.setState({ status: 'failed', reason: res.reason });
  const q = readQuestion(res.data);
  if (q) {
    putDraft({ steps: [...d.steps, { question: q.question, options: q.options, answer: null }] });
    return useSetupRun.setState({ status: 'idle', reason: null });
  }
  const p = readProposal(res.data, lists, startTiers(), d, todayKey());
  if (p) {
    putDraft({ proposal: p });
    return useSetupRun.setState({ status: 'idle', reason: null });
  }
  useSetupRun.setState({ status: 'failed', reason: 'bad_answer' });
}

/** Make the plan: asks for the proposal now, with what's been answered so far. */
export async function makePlan(): Promise<void> {
  const d = getDraft();
  if (!d || useSetupRun.getState().status === 'proposing') return;
  useSetupRun.setState({ status: 'proposing', reason: null });
  const { lists } = useStore.getState();
  // Drop a question that's on screen but unanswered: the coach plans from the answers.
  const steps = d.steps.filter((s) => s.answer !== null);
  const res = await coachCall<unknown>('season_proposal', setupInput({ ...d, steps }, lists, startTiers(), todayKey()));
  if (!getDraft()) return useSetupRun.setState({ status: 'idle', reason: null });
  if (!res.ok) return useSetupRun.setState({ status: 'failed', reason: res.reason });
  const p = readProposal(res.data, lists, startTiers(), d, todayKey());
  if (!p) return useSetupRun.setState({ status: 'failed', reason: 'bad_answer' });
  putDraft({ steps, proposal: p });
  useSetupRun.setState({ status: 'idle', reason: null });
}

/** The opening answer is in: on to the first question. */
export function submitDump() {
  void askNext();
}

/** Picks or types an answer, then asks the next question. */
export function pick(value: string) {
  const d = getDraft();
  if (!d || !value.trim()) return;
  putDraft({ steps: answer(d.steps, value) });
  void askNext();
}

/** Back one question (or to the opening question from the first one). */
export function back() {
  const d = getDraft();
  if (!d) return;
  useSetupRun.setState({ status: 'idle', reason: null });
  putDraft({ steps: stepBack(d.steps) });
}

/** Keep talking: from the proposal back to the questions (one more is asked if there's room). */
export function keepTalking() {
  const d = getDraft();
  if (!d) return;
  putDraft({ proposal: null });
  if (answeredCount(d.steps) < MAX_QUESTIONS) void askNext();
}

/** Try again after a failure: whichever request failed. */
export function retry() {
  const d = getDraft();
  useSetupRun.setState({ status: 'idle', reason: null });
  if (!d) return;
  if (d.steps.length && d.steps[d.steps.length - 1].answer === null) return;
  if (answeredCount(d.steps) >= MAX_QUESTIONS) void makePlan();
  else void askNext();
}

export function discardSetup() {
  useLocal.setState({ seasonSetup: null });
  useSetupRun.setState({ status: 'idle', reason: null });
}

/** Why Save season can't go ahead (dates run into another season), or null. */
export function saveProblem(d: SetupDraft): string | null {
  return dateProblem(useStore.getState().seasons, d.startDate, d.endDate, todayKey());
}

/** Save season: everything in one step, one Undo (docs/13 §2.4). */
export function saveSetup() {
  const d = getDraft();
  if (!d?.proposal || saveProblem(d)) return;
  const line = countLine(d.proposal);
  const { undo } = useStore.getState().addSeasonFromProposal(saveInput(d, d.proposal, null));
  discardSetup();
  router.replace('/season');
  pushSnack({ title: 'Season saved', sub: line || undefined, actions: [{ label: 'Undo', onPress: undo }] });
}
