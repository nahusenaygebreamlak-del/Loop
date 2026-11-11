import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Calls the coach function (docs/13 §6, docs/16 B6). Every failure comes back as a reason the screens can show.

export type CoachAction = 'plan_day' | 'season_turn' | 'season_proposal';
export type CoachFailure = 'limit' | 'busy' | 'timeout' | 'bad_answer' | 'off' | 'offline' | 'signed_out' | 'not_configured' | 'nothing';
export type CoachResult<T> = { ok: true; data: T } | { ok: false; reason: CoachFailure };

const REASON: Record<string, CoachFailure> = {
  limit: 'limit',
  busy: 'busy',
  timeout: 'timeout',
  bad_answer: 'bad_answer',
  coach_off: 'off',
  signed_out: 'signed_out',
  not_configured: 'not_configured',
  nothing_to_plan: 'nothing',
};

/** The line each failure shows (docs/14 F). */
export const COACH_FAILURE_COPY: Record<CoachFailure, string> = {
  limit: 'The coach has done enough for today.',
  busy: 'Couldn’t plan right now.',
  timeout: 'Couldn’t plan right now.',
  bad_answer: 'Couldn’t plan right now.',
  not_configured: 'Couldn’t plan right now.',
  off: 'The coach is off.',
  signed_out: 'Sign in to use the coach.',
  offline: 'Offline · the coach will plan when you’re back online',
  nothing: 'Nothing on for today. Enjoy the space.',
};

/** The function gives up on Gemini at 25 s; the app stops waiting a little after that, whatever happens. */
const APP_TIMEOUT_MS = 40_000;

export async function coachCall<T>(action: CoachAction, body: object): Promise<CoachResult<T>> {
  if (!isSupabaseConfigured) return { ok: false, reason: 'signed_out' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, reason: 'offline' };
  const stop = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    stop.abort();
  }, APP_TIMEOUT_MS);
  try {
    const { data, error } = await supabase.functions.invoke('coach', { body: { action, ...body }, signal: stop.signal });
    if (timedOut) return { ok: false, reason: 'timeout' };
    if (!error) return { ok: true, data: data as T };
    const ctx = (error as { context?: Response }).context;
    const detail = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null;
    if (detail?.error) return { ok: false, reason: REASON[detail.error] ?? 'busy' };
    // No answer from the server at all: the request never got there.
    return { ok: false, reason: /fetch|network|failed to send/i.test(error.message) ? 'offline' : 'busy' };
  } catch {
    return { ok: false, reason: timedOut ? 'timeout' : 'offline' };
  } finally {
    clearTimeout(timer);
  }
}
