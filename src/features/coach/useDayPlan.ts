import { useEffect } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { pushSnack } from '@/components/Snackbar';
import { useCalendar } from '@/calendar/google';
import { leftovers } from '@/lib/checkins';
import {
  acceptedText,
  applySuggestion,
  buildPlanInput,
  mergeReplan,
  MAX_PLAN_RUNS,
  staleReason,
  validatePlan,
  withEdit,
  type Plan,
  type Suggestion,
} from '@/lib/coachPlan';
import { todayKey, type DateKey } from '@/lib/dates';
import { activeSeason } from '@/lib/seasons';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import type { Debrief, PlanEdit, PlanState, Task } from '@/store/types';
import { coachCall, type CoachFailure } from './api';

// The coach's "Today's plan" (docs/13 §2.3, docs/14 A5–A6), shared by the debrief and the Today card.
// The plan itself is saved on the day's debrief and syncs; this store only holds the request in flight.

type RunState = {
  status: 'idle' | 'loading' | 'failed';
  reason: CoachFailure | null;
  /** The day the automatic first run was tried on this device (it runs once; after that, Try again). */
  autoTried: DateKey | null;
  /** Undo for the last accept on this device, for "Plan added to Today · Undo". */
  undo: (() => void) | null;
};

export const usePlanRun = create<RunState>(() => ({ status: 'idle', reason: null, autoTried: null, undo: null }));

/** The day's debrief row that holds the plan (two devices can each have a row). */
export function planRow(debriefs: Debrief[], day: DateKey): Debrief | undefined {
  const rows = debriefs.filter((d) => d.day === day);
  return rows.find((d) => d.plan) ?? rows[0];
}

const calendarEvents = () => {
  const cal = useCalendar.getState();
  const connected = cal.status === 'connected' || cal.status === 'failed';
  return { events: connected ? cal.events : [], hidden: cal.hidden };
};

/** Asks the coach for a plan. `manual` is Plan again (counts toward the 5 a day). */
export async function runPlan(manual: boolean): Promise<void> {
  if (usePlanRun.getState().status === 'loading') return;
  const today = todayKey();
  const { tasks, lists, seasons } = useStore.getState();
  const s = useSettings.getState();
  const { events, hidden } = calendarEvents();
  const input = buildPlanInput({ tasks, lists, season: activeSeason(seasons, today), events, hidden, today, window: { start: s.planStart, end: s.planEnd } });
  if (!input) return; // nothing to plan: the section says so without asking the coach
  usePlanRun.setState({ status: 'loading', reason: null, ...(manual ? null : { autoTried: today }) });
  const res = await coachCall<unknown>('plan_day', input);
  if (!res.ok) {
    usePlanRun.setState({ status: 'failed', reason: res.reason });
    return;
  }
  const fresh = validatePlan(res.data, input);
  if (!fresh) {
    usePlanRun.setState({ status: 'failed', reason: 'bad_answer' });
    return;
  }
  const row = planRow(useStore.getState().debriefs, today);
  const plan = row?.plan ? mergeReplan(row.plan, row.planState, fresh) : fresh;
  useStore.getState().setPlan(today, plan, manual);
  if (row?.planState.dismissed) useStore.getState().setPlanState(today, { dismissed: false });
  usePlanRun.setState({ status: 'idle', reason: null });
}

export type PlanRowView = {
  s: Suggestion;
  task: Task | undefined;
  listName?: string;
  accepted: boolean;
  edited: boolean;
  stale: 'Deleted' | 'Already done' | null;
};

export type PlanView =
  | { state: 'off' }
  | { state: 'waiting' }
  | { state: 'nothing' }
  | { state: 'loading' }
  | { state: 'failed'; reason: CoachFailure }
  | { state: 'dismissed' }
  | { state: 'ready'; plan: Plan; rows: PlanRowView[]; open: PlanRowView[]; allAccepted: boolean; acceptedCount: number; runsLeft: number; loading: boolean; note: CoachFailure | null };

/** Everything the plan section shows, worked out from the data. */
export function useDayPlan(today: DateKey): PlanView {
  const on = useSettings((s) => s.coachEnabled);
  const tasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const debriefs = useStore((s) => s.debriefs);
  const seasons = useStore((s) => s.seasons);
  const run = usePlanRun();
  if (!on) return { state: 'off' };

  const rows = debriefs.filter((d) => d.day === today);
  const row = planRow(debriefs, today);
  const plan = row?.plan ?? null;
  const st: PlanState = row?.planState ?? {};
  // Leftovers come first: the plan waits until they're handled (moved, done, archived, or Not now).
  const handled = rows.some((d) => d.leftoversAction);
  if (!plan && leftovers(tasks, lists, today).length && !handled) return { state: 'waiting' };
  if (plan && st.dismissed) return { state: 'dismissed' };

  if (plan) {
    const accepted = new Set(st.accepted ?? []);
    const view: PlanRowView[] = plan.suggestions.map((raw) => {
      const task = tasks.find((t) => t.id === raw.taskId);
      const isAccepted = accepted.has(raw.taskId);
      return {
        s: withEdit(raw, st.edited?.[raw.taskId]),
        task,
        listName: lists.find((l) => l.id === task?.listId)?.name,
        accepted: isAccepted,
        edited: !!st.edited?.[raw.taskId],
        stale: isAccepted ? null : staleReason(task),
      };
    });
    const open = view.filter((r) => !r.accepted && !r.stale);
    const acceptedCount = view.filter((r) => r.accepted).length;
    return {
      state: 'ready',
      plan,
      rows: view,
      open,
      acceptedCount,
      allAccepted: acceptedCount > 0 && open.length === 0,
      runsLeft: Math.max(0, MAX_PLAN_RUNS - (row?.planRuns ?? 0)),
      loading: run.status === 'loading',
      note: run.status === 'failed' ? run.reason : null,
    };
  }
  // Nothing due, left over or undated in a core list: no need to ask the coach.
  if (!buildPlanInput({ tasks, lists, season: activeSeason(seasons, today), events: [], today, window: { start: '00:00', end: '23:59' } })) return { state: 'nothing' };
  if (run.status === 'failed' && run.reason) return run.reason === 'nothing' ? { state: 'nothing' } : { state: 'failed', reason: run.reason };
  // Loading, or about to start (useAutoPlan runs it).
  return { state: 'loading' };
}

/** Runs the plan the first time the debrief opens each day (coach on, nothing waiting, no plan yet). */
export function useAutoPlan(today: DateKey, view: PlanView) {
  const tried = usePlanRun((s) => s.autoTried);
  const hasPlan = useStore((s) => !!planRow(s.debriefs, today)?.plan);
  const go = view.state === 'loading' && !hasPlan && tried !== today;
  useEffect(() => {
    if (go) void runPlan(false);
  }, [go]);

  // Offline: plan once the connection comes back.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const back = () => {
      const r = usePlanRun.getState();
      if (r.status === 'failed' && r.reason === 'offline') usePlanRun.setState({ status: 'idle', reason: null, autoTried: null });
    };
    window.addEventListener('online', back);
    return () => window.removeEventListener('online', back);
  }, []);
}

/** Try again after a failure: forget the failed attempt and run once more (not counted as Plan again). */
export function retryPlan() {
  usePlanRun.setState({ status: 'idle', reason: null });
  void runPlan(false);
}

/**
 * Accepts suggestions: each changes its task as suggested (with any changed time), all in one Undo step.
 * A task that was overdue counts as carried over, the same as in the check-in.
 */
export function acceptSuggestions(today: DateKey, taskIds: string[]) {
  const store = useStore.getState();
  const row = planRow(store.debriefs, today);
  if (!row?.plan) return;
  const st = row.planState;
  const before = st.accepted ?? [];
  const done: { s: Suggestion; id: string; prev: Partial<Task> }[] = [];
  for (const id of taskIds) {
    if (before.includes(id)) continue;
    const raw = row.plan.suggestions.find((x) => x.taskId === id);
    const task = store.tasks.find((t) => t.id === id);
    if (!raw || staleReason(task) || !task) continue;
    const s = withEdit(raw, st.edited?.[id]);
    const { next, prev } = applySuggestion(task, s, today);
    const overdue = !!task.dueDate && task.dueDate < today;
    store.updateTask(id, { ...next, ...(overdue ? { carriedOverCount: task.carriedOverCount + 1, carriedAt: today } : null) });
    done.push({ s, id, prev: { ...prev, ...(overdue ? { carriedOverCount: task.carriedOverCount, carriedAt: task.carriedAt ?? null } : null) } });
  }
  if (!done.length) return;
  const accepted = [...before, ...done.map((d) => d.id)];
  store.setPlanState(today, { accepted });
  const undo = () => {
    for (const d of done) useStore.getState().updateTask(d.id, d.prev);
    const now = planRow(useStore.getState().debriefs, today)?.planState.accepted ?? [];
    useStore.getState().setPlanState(today, { accepted: now.filter((x) => !done.some((d) => d.id === x)) });
    usePlanRun.setState({ undo: null });
  };
  usePlanRun.setState({ undo });
  pushSnack({ title: done.length === 1 && taskIds.length === 1 ? acceptedText(done[0].s, today) : 'Plan added to Today', actions: [{ label: 'Undo', onPress: undo }] });
}

/** "Not today" hides the plan for the day; "Show plan" brings it back. */
export function dismissPlan(today: DateKey, dismissed: boolean) {
  useStore.getState().setPlanState(today, { dismissed });
}

/** Saves a time or day changed before accepting (applied when it's accepted). */
export function editSuggestion(today: DateKey, taskId: string, edit: PlanEdit) {
  const row = planRow(useStore.getState().debriefs, today);
  useStore.getState().setPlanState(today, { edited: { ...(row?.planState.edited ?? {}), [taskId]: edit } });
}

/** Task ids that came from today's plan, for the "From the plan" chip on Today. */
export function useFromPlan(today: DateKey): Set<string> {
  const accepted = useStore((s) => planRow(s.debriefs, today)?.planState.accepted);
  return new Set(accepted ?? []);
}
