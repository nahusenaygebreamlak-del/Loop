// Loop · the coach (docs/13 §6, docs/16). Suggests a plan for today and helps set up a season.
// It only ever returns suggestions; the app applies them when the person taps.
//
// Secret to set once (Supabase → Edge Functions → Secrets): GEMINI_API_KEY.
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
//
// Privacy: the function forwards only the fields listed in `cleanPlanInput` / `cleanSeasonInput`
// (never task notes, Notes, Inbox, tags, name or email), asks Gemini not to store the request,
// and logs only the action, duration, status and token counts.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { COACH_PROMPT_VERSION, PLAN_DAY_PROMPT, SEASON_PROMPT } from './prompts.ts';
import { PLAN_SCHEMA, SEASON_SCHEMA } from './schemas.ts';

const COACH_MODEL = 'gemini-3.8-flash';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const DAILY_LIMIT = 20;
const TIMEOUT_MS = 25_000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// ─── What may be sent (everything else is dropped here, whatever the app sends) ───

type Obj = Record<string, unknown>;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const optStr = (v: unknown, max: number) => (typeof v === 'string' && v ? v.slice(0, max) : undefined);
const num = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : 0);
const arr = (v: unknown, max: number): Obj[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as Obj[]).slice(0, max) : []);
const TIERS = ['core', 'secondary', 'support'];
const tierOf = (v: unknown) => (TIERS.includes(v as string) ? (v as string) : 'support');

function cleanPlanInput(b: Obj) {
  return {
    today: str(b.today, 10),
    weekday: str(b.weekday, 12),
    window: { start: str((b.window as Obj)?.start, 5), end: str((b.window as Obj)?.end, 5) },
    events: arr(b.events, 40).map((e) => ({ title: str(e.title, 120), start: str(e.start, 5), end: str(e.end, 5) })),
    // What the person said matters this season (saved at setup). Optional.
    brief: optStr(b.brief, 600),
    tasks: arr(b.tasks, 60).map((t) => ({
      id: str(t.id, 64),
      title: str(t.title, 200),
      list: optStr(t.list, 60),
      tier: tierOf(t.tier),
      priority: num(t.priority, 0, 3),
      due: optStr(t.due, 10),
      start: optStr(t.start, 5),
      end: optStr(t.end, 5),
      carriedOver: num(t.carriedOver, 0, 99),
      subtasks: num(t.subtasks, 0, 99),
    })),
  };
}

function cleanSeasonInput(b: Obj, mode: 'turn' | 'proposal') {
  return {
    mode,
    today: str(b.today, 10),
    endDate: str(b.endDate, 10),
    weeks: num(b.weeks, 1, 52),
    lists: arr(b.lists, 40).map((l) => ({ id: str(l.id, 64), name: str(l.name, 60), tier: tierOf(l.tier) })),
    // The setup so far: what they wrote first, then each question and their answer. At most 6 questions.
    asked: num(b.asked, 0, 6),
    chat: arr(b.chat, 13).map((m) => ({ from: m.from === 'coach' ? 'coach' : 'you', text: str(m.text, 2000) })),
  };
}

// ─── What may come back (shape only; the day-plan rules are checked on the device) ───

/** Cuts at a word boundary so a long line never ends mid-word. */
function trim(v: unknown, max: number): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.–-]+$/, '') + '…';
}
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function cleanPlan(raw: unknown) {
  const o = raw as Obj;
  if (!o || typeof o !== 'object' || !Array.isArray(o.suggestions)) return null;
  const suggestions = arr(o.suggestions, 8)
    .filter((s) => typeof s.taskId === 'string' && ['schedule', 'today', 'later'].includes(s.kind as string))
    .map((s) => ({
      taskId: s.taskId as string,
      kind: s.kind as string,
      ...(HHMM.test(String(s.start)) ? { start: String(s.start) } : null),
      ...(HHMM.test(String(s.end)) ? { end: String(s.end) } : null),
      ...(DATE.test(String(s.date)) ? { date: String(s.date) } : null),
      reason: trim(s.reason, 80),
    }));
  return { summary: trim(o.summary, 140), suggestions };
}

function cleanSeason(raw: unknown, mode: 'turn' | 'proposal') {
  const o = raw as Obj;
  if (!o || typeof o !== 'object') return null;
  if (mode === 'turn' && o.type === 'question' && typeof o.text === 'string' && o.text.trim()) {
    const options = (Array.isArray(o.options) ? o.options : []).filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, 4).map((x) => trim(x, 90));
    return { type: 'question', text: trim(o.text, 300), options };
  }
  if (!Array.isArray(o.tiers)) return null;
  return {
    type: 'proposal',
    intro: trim(o.intro, 200),
    tiers: arr(o.tiers, 60).filter((t) => typeof t.listId === 'string').map((t) => ({ listId: t.listId as string, tier: tierOf(t.tier) })),
    newLists: arr(o.newLists, 5).filter((l) => typeof l.tempId === 'string' && typeof l.name === 'string' && (l.name as string).trim()).map((l) => ({ tempId: l.tempId as string, name: trim(l.name, 40), tier: tierOf(l.tier) })),
    goals: arr(o.goals, 12).filter((g) => typeof g.listRef === 'string' && typeof g.goal === 'string' && (g.goal as string).trim()).map((g) => ({ listRef: g.listRef as string, goal: trim(g.goal, 80) })),
    tasks: arr(o.tasks, 15).filter((t) => typeof t.listRef === 'string' && typeof t.title === 'string' && (t.title as string).trim()).map((t) => ({ listRef: t.listRef as string, title: trim(t.title, 120), ...(DATE.test(String(t.date)) ? { date: String(t.date) } : null) })),
    brief: trim(o.brief, 600),
  };
}

// ─── Gemini ───

type Outcome = { ok: true; data: unknown; tokensIn: number; tokensOut: number } | { ok: false; status: number; error: string; note?: string };

/** The answer's text, wherever this API version puts it. */
function outputText(d: Obj): string {
  if (typeof d.output_text === 'string') return d.output_text;
  const parts: string[] = [];
  for (const key of ['steps', 'outputs']) {
    for (const step of arr(d[key], 50)) {
      if (step.type && step.type !== 'model_output' && step.type !== 'text') continue;
      if (typeof step.text === 'string') parts.push(step.text);
      for (const c of arr(step.content, 50)) if (typeof c.text === 'string') parts.push(c.text);
    }
  }
  return parts.join('');
}

async function askGemini(key: string, system: string, input: unknown, schema: unknown): Promise<Outcome> {
  let res: Response;
  try {
    res = await fetch(GEMINI_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: COACH_MODEL,
        system_instruction: system,
        input: JSON.stringify(input),
        response_format: { type: 'text', mime_type: 'application/json', schema },
        store: false, // nothing is kept on Google's side for later turns
      }),
    });
  } catch (e) {
    const timedOut = (e as { name?: string })?.name === 'TimeoutError' || (e as { name?: string })?.name === 'AbortError';
    return timedOut ? { ok: false, status: 504, error: 'timeout' } : { ok: false, status: 503, error: 'busy', note: 'network' };
  }
  if (!res.ok) {
    // 429 = the free tier's request limit; 401/403 = a key problem; 400 = a request Gemini didn't accept.
    const note = res.status === 429 ? 'quota' : res.status === 401 || res.status === 403 ? 'key' : `gemini_${res.status}`;
    await res.body?.cancel().catch(() => {});
    return { ok: false, status: 503, error: 'busy', note };
  }
  const d = (await res.json().catch(() => null)) as Obj | null;
  if (!d) return { ok: false, status: 502, error: 'bad_answer' };
  const usage = (d.usage ?? {}) as Obj;
  try {
    return { ok: true, data: JSON.parse(outputText(d)), tokensIn: Number(usage.total_input_tokens ?? 0), tokensOut: Number(usage.total_output_tokens ?? 0) };
  } catch {
    return { ok: false, status: 502, error: 'bad_answer' };
  }
}

// ─── Handler ───

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const started = Date.now();
  const auth = req.headers.get('Authorization') ?? '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return json({ error: 'signed_out' }, 401);

  const body = ((await req.json().catch(() => ({}))) ?? {}) as Obj;
  const action = String(body.action ?? '');
  if (!['plan_day', 'season_turn', 'season_proposal'].includes(action)) return json({ error: 'unknown_action' }, 400);

  const log = (status: number, extra: Obj = {}) => console.log(JSON.stringify({ fn: 'coach', action, status, ms: Date.now() - started, prompt: COACH_PROMPT_VERSION, ...extra }));
  const stop = (error: string, status: number, extra: Obj = {}) => {
    log(status, { error, ...extra });
    return json({ error }, status);
  };

  // The coach must be turned on (after the privacy sheet) before anything is sent anywhere.
  const { data: profile } = await userClient.from('profiles').select('coach_enabled, coach_consent_at').eq('id', userId).maybeSingle();
  if (!profile?.coach_enabled || !profile?.coach_consent_at) return stop('coach_off', 403);

  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return stop('not_configured', 500);

  // Count the call before making it, so a failing loop can't run on.
  const day = new Date().toISOString().slice(0, 10);
  const { data: allowed, error: countError } = await admin.rpc('coach_count_call', { p_user: userId, p_day: day, p_limit: DAILY_LIMIT });
  if (countError) return stop('not_configured', 500, { note: 'usage_table' });
  if (!allowed) return stop('limit', 429);

  let out: Outcome;
  let clean: unknown = null;
  if (action === 'plan_day') {
    const input = cleanPlanInput(body);
    if (!input.tasks.length) return stop('nothing_to_plan', 400);
    out = await askGemini(key, PLAN_DAY_PROMPT, input, PLAN_SCHEMA);
    if (out.ok) clean = cleanPlan(out.data);
  } else {
    const mode = action === 'season_turn' ? 'turn' : 'proposal';
    out = await askGemini(key, SEASON_PROMPT, cleanSeasonInput(body, mode), SEASON_SCHEMA);
    if (out.ok) clean = cleanSeason(out.data, mode);
  }

  if (!out.ok) return stop(out.error, out.status, out.note ? { note: out.note } : {});
  if (!clean) return stop('bad_answer', 502, { tokensIn: out.tokensIn, tokensOut: out.tokensOut });
  log(200, { tokensIn: out.tokensIn, tokensOut: out.tokensOut });
  return json(clean);
});
