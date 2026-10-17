import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { addDays, todayKey } from '@/lib/dates';
import type { GEvent } from '@/lib/events';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Google Calendar, read-only (Milestone 7). Events are fetched through the google-calendar
// Edge Function and cached on the device, so Loop still shows them offline ("last seen 09:00").

export type GCalendar = { id: string; google_id: string; name: string; enabled: boolean };
type Status = 'off' | 'connecting' | 'connected' | 'failed';

type CalendarState = {
  status: Status;
  calendars: GCalendar[];
  events: GEvent[];
  hidden: string[];
  /** When events were last fetched successfully. */
  fetchedAt: string | null;
  /** "Google Calendar connected" snackbar after connecting. */
  justConnected: boolean;
  /** NSetupGoogle's "Not now". */
  setupDismissed: boolean;
  /** NGoogleFailed's "Later": day it was dismissed (shown once a day on Today). */
  failedDismissedOn: string | null;
};

export const useCalendar = create<CalendarState>()(
  persist(
    () =>
      ({ status: 'off', calendars: [], events: [], hidden: [], fetchedAt: null, justConnected: false, setupDismissed: false, failedDismissedOn: null }) as CalendarState,
    { name: 'loop.calendar.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const PENDING = 'loop.calendar.connecting';

async function call<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke('google-calendar', { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const detail = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
}

/** NGoogleConsent: asks Google for read-only calendar access, then hands the token to the server. */
export async function connectGoogleCalendar(): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('not-configured');
  useCalendar.setState({ status: 'connecting' });
  const options = { scopes: SCOPE, queryParams: { access_type: 'offline', prompt: 'consent' } };
  try {
    if (Platform.OS === 'web') {
      // Full-page redirect; finishWebConnect() picks it up when the app loads again.
      window.sessionStorage.setItem(PENDING, '1');
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { ...options, redirectTo: `${window.location.origin}/calendar` } });
      if (error) throw error;
      return;
    }
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { ...options, redirectTo, skipBrowserRedirect: true } });
    if (error) throw error;
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') {
      useCalendar.setState((s) => ({ status: s.calendars.length ? 'failed' : 'off' }));
      return;
    }
    const code = new URL(result.url).searchParams.get('code');
    if (!code) throw new Error('no-code');
    const { data: exchanged, error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) throw exErr;
    await finishConnect(exchanged.session?.provider_refresh_token);
  } catch (e) {
    useCalendar.setState({ status: 'failed' });
    throw e;
  }
}

/** Web: after the redirect back, the new session carries Google's refresh token. */
export function finishWebConnect() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.sessionStorage.getItem(PENDING)) return;
  const { data } = supabase.auth.onAuthStateChange((_e, s) => {
    if (!s) return;
    window.sessionStorage.removeItem(PENDING);
    data.subscription.unsubscribe();
    void finishConnect(s.provider_refresh_token).catch(() => useCalendar.setState({ status: 'failed' }));
  });
}

async function finishConnect(refresh: string | null | undefined) {
  if (!refresh) throw new Error('no-refresh-token');
  const { calendars } = await call<{ calendars: GCalendar[] }>({ action: 'connect', refresh_token: refresh });
  useCalendar.setState({ status: 'connected', calendars, justConnected: true, setupDismissed: false, failedDismissedOn: null });
  await refreshEvents();
}

let inflight: Promise<void> | null = null;

/** Fetches 5 weeks back and 10 weeks ahead. Quietly keeps the old events when Google can't be reached. */
export function refreshEvents(): Promise<void> {
  const s = useCalendar.getState();
  if (s.status === 'off' || s.status === 'connecting' || !isSupabaseConfigured) return Promise.resolve();
  if (inflight) return inflight;
  const today = todayKey();
  const timeMin = new Date(`${addDays(today, -35)}T00:00:00`).toISOString();
  const timeMax = new Date(`${addDays(today, 70)}T00:00:00`).toISOString();
  const p: Promise<void> = call<{ events: GEvent[]; hidden: string[] }>({ action: 'events', timeMin, timeMax })
    .then(({ events, hidden }) => {
      useCalendar.setState({ status: 'connected', events, hidden, fetchedAt: new Date().toISOString() });
    })
    .catch((e: Error) => {
      if (e.message === 'not_connected') useCalendar.setState({ status: 'off', calendars: [], events: [] });
      else useCalendar.setState({ status: 'failed' });
    })
    .finally(() => {
      inflight = null;
    });
  inflight = p;
  return p;
}

export async function loadCalendars(): Promise<void> {
  const { calendars } = await call<{ calendars: GCalendar[] }>({ action: 'calendars' });
  useCalendar.setState({ calendars });
}

/** Per-calendar toggle in Account and Google. */
export async function setCalendarEnabled(id: string, enabled: boolean): Promise<void> {
  useCalendar.setState((s) => ({ calendars: s.calendars.map((c) => (c.id === id ? { ...c, enabled } : c)) }));
  const { error } = await supabase.from('google_calendars').update({ enabled }).eq('id', id);
  if (error) throw error;
  await refreshEvents();
}

/** Ticking an event hides it from Loop's lists. Loop never changes Google. */
export async function setEventHidden(eventId: string, hide: boolean): Promise<void> {
  useCalendar.setState((s) => ({ hidden: hide ? [...new Set([...s.hidden, eventId])] : s.hidden.filter((h) => h !== eventId) }));
  if (hide) await supabase.from('hidden_events').upsert({ google_event_id: eventId });
  else await supabase.from('hidden_events').delete().eq('google_event_id', eventId);
}

export async function disconnectGoogleCalendar(): Promise<void> {
  await call({ action: 'disconnect' }).catch(() => {});
  useCalendar.setState({ status: 'off', calendars: [], events: [], hidden: [], fetchedAt: null });
}

/** Signing out clears the cached events. */
export function clearCalendarCache() {
  useCalendar.setState({ status: 'off', calendars: [], events: [], hidden: [], fetchedAt: null, justConnected: false });
}
