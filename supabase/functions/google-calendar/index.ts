// Loop · Google Calendar, read-only (Milestone 7).
// Keeps the Google refresh token on the server (it needs the OAuth client secret to renew),
// lists the person's calendars and returns events for a date range. Never writes to Google.
//
// Secrets to set once (Supabase → Edge Functions → Secrets): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const G = 'https://www.googleapis.com/calendar/v3';

async function accessToken(refresh: string): Promise<string | null> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      refresh_token: refresh,
      grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) return null;
  return (await r.json()).access_token ?? null;
}

async function syncCalendars(userId: string, token: string) {
  const r = await fetch(`${G}/users/me/calendarList?minAccessRole=reader`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`calendarList ${r.status}`);
  const items = ((await r.json()).items ?? []) as { id: string; summary: string; summaryOverride?: string; primary?: boolean; selected?: boolean }[];
  const { data: existing } = await admin.from('google_calendars').select('google_id').eq('user_id', userId);
  const known = new Set((existing ?? []).map((x) => x.google_id));
  const fresh = items.filter((c) => !known.has(c.id));
  if (fresh.length) {
    // New calendars start on when they're shown in Google (the person's own choice there).
    await admin.from('google_calendars').insert(fresh.map((c) => ({ user_id: userId, google_id: c.id, name: c.summaryOverride ?? c.summary, enabled: c.primary || c.selected !== false })));
  }
  for (const c of items.filter((c) => known.has(c.id))) {
    await admin.from('google_calendars').update({ name: c.summaryOverride ?? c.summary }).eq('user_id', userId).eq('google_id', c.id);
  }
  const gone = [...known].filter((id) => !items.some((c) => c.id === id));
  if (gone.length) await admin.from('google_calendars').delete().eq('user_id', userId).in('google_id', gone);
  const { data } = await admin.from('google_calendars').select('id, google_id, name, enabled').eq('user_id', userId).order('name');
  return data ?? [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const auth = req.headers.get('Authorization') ?? '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return json({ error: 'signed_out' }, 401);

  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === 'connect') {
      if (!body.refresh_token) return json({ error: 'no_refresh_token' }, 400);
      await admin.from('google_tokens').upsert({ user_id: userId, refresh_token: body.refresh_token, updated_at: new Date().toISOString() });
      const token = await accessToken(body.refresh_token);
      if (!token) return json({ error: 'reauth' }, 401);
      return json({ calendars: await syncCalendars(userId, token) });
    }

    const { data: row } = await admin.from('google_tokens').select('refresh_token').eq('user_id', userId).maybeSingle();

    if (body.action === 'disconnect') {
      if (row) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(row.refresh_token)}`, { method: 'POST' }).catch(() => {});
      await admin.from('google_tokens').delete().eq('user_id', userId);
      await admin.from('google_calendars').delete().eq('user_id', userId);
      return json({ ok: true });
    }

    if (!row) return json({ error: 'not_connected' }, 404);
    const token = await accessToken(row.refresh_token);
    if (!token) return json({ error: 'reauth' }, 401);

    if (body.action === 'calendars') return json({ calendars: await syncCalendars(userId, token) });

    if (body.action === 'events') {
      const { data: cals } = await admin.from('google_calendars').select('google_id, name').eq('user_id', userId).eq('enabled', true);
      const { data: hidden } = await admin.from('hidden_events').select('google_event_id').eq('user_id', userId);
      const params = new URLSearchParams({ timeMin: body.timeMin, timeMax: body.timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
      const events: unknown[] = [];
      await Promise.all(
        (cals ?? []).map(async (c) => {
          const r = await fetch(`${G}/calendars/${encodeURIComponent(c.google_id)}/events?${params}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!r.ok) return;
          for (const e of (await r.json()).items ?? []) {
            if (e.status === 'cancelled') continue;
            const me = (e.attendees ?? []).find((a: { self?: boolean }) => a.self);
            if (me?.responseStatus === 'declined') continue;
            events.push({
              id: e.id,
              calendarId: c.google_id,
              calendarName: c.name,
              title: e.summary ?? '(No title)',
              start: e.start?.dateTime ?? e.start?.date,
              end: e.end?.dateTime ?? e.end?.date,
              allDay: !e.start?.dateTime,
              location: e.location ?? null,
              description: e.description ?? null,
              attendees: (e.attendees ?? []).filter((a: { self?: boolean; resource?: boolean }) => !a.self && !a.resource).map((a: { displayName?: string; email: string }) => a.displayName ?? a.email.split('@')[0]),
              link: e.htmlLink ?? null,
            });
          }
        }),
      );
      return json({ events, hidden: (hidden ?? []).map((h) => h.google_event_id) });
    }
    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    return json({ error: 'google_failed', detail: String(e) }, 502);
  }
});
