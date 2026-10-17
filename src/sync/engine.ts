import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import type { InboxItem, List, Note, Tag, Task } from '@/store/types';
import {
  COLLECTION,
  DELETE_ORDER,
  diff,
  fromRow,
  matchListsByName,
  profileToSettings,
  PUSH_ORDER,
  settingsToProfile,
  toRow,
  type ProfileSettings,
  type Row,
  type Table,
} from './mapping';

// Offline-first sync with Supabase.
// The app always reads and writes the local store. Every local change is recorded in a
// persisted outbox ("table:id" → sequence number); a sync pulls what changed on the server
// since the last cursor, then pushes the outbox. Local edits that haven't been pushed win.

type Entity = List | Task | Tag | InboxItem | Note;
type Meta = {
  userId: string | null;
  cursor: string | null;
  seq: number;
  dirty: Record<string, number>;
  deleted: Record<string, number>;
  profileDirty: number;
};

const useMeta = create<Meta>()(
  persist(() => ({ userId: null, cursor: null, seq: 0, dirty: {}, deleted: {}, profileDirty: 0 }) as Meta, {
    name: 'loop.sync.v1',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

export type SyncState = 'off' | 'syncing' | 'synced' | 'offline' | 'error';
export const useSyncStatus = create<{ state: SyncState; lastSyncedAt: string | null; pending: number }>(() => ({
  state: 'off',
  lastSyncedAt: null,
  pending: 0,
}));

const key = (t: Table, id: string) => `${t}:${id}`;
const parseKey = (k: string) => {
  const i = k.indexOf(':');
  return { table: k.slice(0, i) as Table, id: k.slice(i + 1) };
};
const pendingCount = () => Object.keys(useMeta.getState().dirty).length + Object.keys(useMeta.getState().deleted).length + (useMeta.getState().profileDirty ? 1 : 0);
const refreshPending = () => useSyncStatus.setState({ pending: pendingCount() });

let applyingRemote = false;
let userId: string | null = null;
let adopting = false;
let running: Promise<void> | null = null;
let again = false;
const cleanups: (() => void)[] = [];

function profileOf(s: ProfileSettings): ProfileSettings {
  const { theme, weekStart, timeFormat, morningTime, afternoonTime, sortTime, fullScreen, weekends, remindUntilAct } = s;
  return { theme, weekStart, timeFormat, morningTime, afternoonTime, sortTime, fullScreen, weekends, remindUntilAct };
}

function waitHydrated(store: { persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } }) {
  return new Promise<void>((resolve) => {
    if (store.persist.hasHydrated()) return resolve();
    const unsub = store.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

let outboxInstalled = false;
/**
 * Records local edits into the outbox whenever this device belongs to an account,
 * even while sync isn't running (a notification button changes tasks with the app closed).
 */
export function installOutbox() {
  if (outboxInstalled) return;
  outboxInstalled = true;
  const subs = [
    useStore.subscribe((next, prev) => {
      if (applyingRemote || !useMeta.getState().userId) return;
      const m = useMeta.getState();
      const dirty = { ...m.dirty };
      const deleted = { ...m.deleted };
      let seq = m.seq;
      let touched = false;
      for (const table of PUSH_ORDER) {
        const col = COLLECTION[table];
        if (next[col] === prev[col]) continue;
        const d = diff(prev[col] as { id: string }[], next[col] as { id: string }[]);
        for (const id of d.changed) {
          dirty[key(table, id)] = ++seq;
          delete deleted[key(table, id)];
          touched = true;
        }
        for (const id of d.removed) {
          deleted[key(table, id)] = ++seq;
          delete dirty[key(table, id)];
          touched = true;
        }
      }
      if (touched) {
        useMeta.setState({ dirty, deleted, seq });
        refreshPending();
        scheduleSoon();
      }
    }),
    useSettings.subscribe((next, prev) => {
      if (applyingRemote || !useMeta.getState().userId) return;
      if (JSON.stringify(profileOf(next)) === JSON.stringify(profileOf(prev))) return;
      useMeta.setState((m) => ({ seq: m.seq + 1, profileDirty: m.seq + 1 }));
      refreshPending();
      scheduleSoon();
    }),
  
  ];
  void subs;
}

/** For code running with the app closed: wait for saved state, then record edits for the next sync. */
export async function prepareOutbox() {
  await Promise.all([waitHydrated(useStore), waitHydrated(useSettings), waitHydrated(useMeta)]);
  installOutbox();
}

/** Starts syncing for a signed-in user. */
export async function startSync(uid: string) {
  if (userId === uid) return;
  stopSync();
  await Promise.all([waitHydrated(useStore), waitHydrated(useSettings), waitHydrated(useMeta)]);
  userId = uid;

  const meta = useMeta.getState();
  if (meta.userId && meta.userId !== uid) {
    // Someone else's data is on this device: start clean.
    clearLocalData();
  }
  adopting = useMeta.getState().userId !== uid;
  installOutbox();
  if (adopting) useMeta.setState({ userId: uid, cursor: null, dirty: {}, deleted: {}, profileDirty: 0 });

  // When to sync: now, every 30 s, when the app comes back, when the web page goes online.
  const interval = setInterval(() => void syncNow(), 30_000);
  cleanups.push(() => clearInterval(interval));
  const app = AppState.addEventListener('change', (s) => s === 'active' && void syncNow());
  cleanups.push(() => app.remove());
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const online = () => void syncNow();
    window.addEventListener('online', online);
    cleanups.push(() => window.removeEventListener('online', online));
  }
  refreshPending();
  void syncNow();
}

export function stopSync() {
  cleanups.splice(0).forEach((fn) => fn());
  userId = null;
  if (soon) clearTimeout(soon);
  useSyncStatus.setState({ state: 'off' });
}

/** Sign out: push what's left (briefly), then remove this account's data from the device. */
export async function signOutSync() {
  if (userId) {
    await Promise.race([syncNow(), new Promise((r) => setTimeout(r, 4000))]);
  }
  stopSync();
  clearLocalData();
  useMeta.setState({ userId: null, cursor: null, dirty: {}, deleted: {}, profileDirty: 0 });
  useStore.getState().seedDefaults();
}

function clearLocalData() {
  applyingRemote = true;
  useStore.setState({ lists: [], tasks: [], tags: [], inbox: [], notes: [] });
  applyingRemote = false;
}

let soon: ReturnType<typeof setTimeout> | null = null;
/** Pushes shortly after a burst of edits. */
function scheduleSoon() {
  if (soon) clearTimeout(soon);
  soon = setTimeout(() => void syncNow(), 1500);
}

export function syncNow(): Promise<void> {
  if (!userId) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    useSyncStatus.setState({ state: 'syncing' });
    try {
      do {
        again = false;
        await pull();
        if (adopting) {
          markEverythingDirty();
          adopting = false;
        }
        await push();
      } while (again);
      useSyncStatus.setState({ state: 'synced', lastSyncedAt: new Date().toISOString() });
    } catch (e) {
      useSyncStatus.setState({ state: isNetworkError(e) ? 'offline' : 'error' });
      if (!isNetworkError(e)) console.warn('[sync]', e);
    } finally {
      refreshPending();
      running = null;
    }
  })();
  return running;
}

function isNetworkError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e).toLowerCase();
  return msg.includes('fetch') || msg.includes('network') || msg.includes('offline') || msg.includes('timeout');
}

function fail(error: { message: string; code?: string } | null, what: string) {
  if (error) throw Object.assign(new Error(`${what}: ${error.message}`), { code: error.code });
}

async function fetchAll(table: string, since: string | null, column = 'updated_at'): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select('*').order(column).range(from, from + 999);
    if (since) q = q.gt(column, since);
    const { data, error } = await q;
    fail(error, `pull ${table}`);
    out.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) return out;
  }
}

async function pull() {
  const { cursor } = useMeta.getState();
  // Re-read a few seconds back: rows committed slightly out of order are not missed.
  const since = cursor ? new Date(Date.parse(cursor) - 5000).toISOString() : null;
  const rows = {} as Record<Table, Row[]>;
  for (const table of PUSH_ORDER) rows[table] = await fetchAll(table, since);
  const tombstones = await fetchAll('deleted_rows', since, 'deleted_at');
  const { data: profile, error: pErr } = await supabase.from('profiles').select('*').eq('id', userId!).maybeSingle();
  fail(pErr, 'pull profile');

  let max = cursor ?? '1970-01-01T00:00:00.000Z';
  const bump = (v: unknown) => {
    if (v) {
      const s = new Date(String(v)).toISOString();
      if (s > max) max = s;
    }
  };
  Object.values(rows).forEach((rs) => rs.forEach((r) => bump(r.updated_at)));
  tombstones.forEach((t) => bump(t.deleted_at));

  const meta = useMeta.getState();
  applyingRemote = true;
  try {
    useStore.setState((s) => {
      const next = { lists: s.lists, tasks: s.tasks, tags: s.tags, inbox: s.inbox, notes: s.notes } as Record<string, Entity[]>;

      // First sign-in here: fold local lists into the account's lists with the same name.
      if (adopting) {
        const remoteLists = rows.lists.map((r) => fromRow('lists', r) as List);
        const map = matchListsByName(next.lists as List[], remoteLists);
        if (map.size) {
          next.lists = (next.lists as List[]).filter((l) => !map.has(l.id));
          next.tasks = (next.tasks as Task[]).map((t) => (t.listId && map.has(t.listId) ? { ...t, listId: map.get(t.listId)! } : t));
        }
      }

      for (const table of PUSH_ORDER) {
        const col = COLLECTION[table];
        if (!rows[table].length) continue;
        const byId = new Map((next[col] as Entity[]).map((x) => [x.id, x]));
        for (const r of rows[table]) {
          const id = String(r.id);
          if (meta.dirty[key(table, id)] || meta.deleted[key(table, id)]) continue; // local edit wins
          byId.set(id, fromRow(table, r));
        }
        next[col] = [...byId.values()];
      }
      for (const t of tombstones) {
        const table = t.table_name as Table;
        const k = key(table, String(t.row_id));
        if (meta.dirty[k]) continue;
        const col = COLLECTION[table];
        next[col] = (next[col] as Entity[]).filter((x) => x.id !== t.row_id);
      }
      return next as unknown as Partial<typeof s>;
    });
    if (profile && !meta.profileDirty) {
      const remote = profileToSettings(profile as Row);
      if (JSON.stringify(remote) !== JSON.stringify(profileOf(useSettings.getState()))) useSettings.getState().set(remote);
    }
  } finally {
    applyingRemote = false;
  }
  useMeta.setState({ cursor: max });
}

function markEverythingDirty() {
  const s = useStore.getState();
  const m = useMeta.getState();
  let seq = m.seq;
  const dirty = { ...m.dirty };
  for (const table of PUSH_ORDER) {
    for (const x of s[COLLECTION[table]] as Entity[]) dirty[key(table, x.id)] = ++seq;
  }
  useMeta.setState({ dirty, seq });
}

async function upsertRows(table: Table, rows: Row[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase.from(table).upsert(chunk);
    if (!error) continue;
    // A task pointing at a list that no longer exists: keep the task, drop the link.
    if (error.code === '23503' && table === 'tasks') {
      for (const r of chunk) {
        const { error: e1 } = await supabase.from(table).upsert(r);
        if (e1?.code === '23503') {
          const { error: e2 } = await supabase.from(table).upsert({ ...r, list_id: null });
          fail(e2, `push ${table}`);
        } else fail(e1, `push ${table}`);
      }
      continue;
    }
    fail(error, `push ${table}`);
  }
}

async function push() {
  const m = useMeta.getState();
  const s = useStore.getState();
  const sent: Record<string, number> = {};

  for (const table of PUSH_ORDER) {
    const col = COLLECTION[table];
    const byId = new Map((s[col] as Entity[]).map((x) => [x.id, x]));
    const rows: Row[] = [];
    for (const [k, n] of Object.entries(m.dirty)) {
      const p = parseKey(k);
      if (p.table !== table) continue;
      const x = byId.get(p.id);
      if (x) rows.push(toRow(table, x, userId!));
      sent[k] = n;
    }
    if (rows.length) await upsertRows(table, rows);
  }

  const deletedSent: Record<string, number> = {};
  for (const table of DELETE_ORDER) {
    const ids = Object.entries(m.deleted)
      .filter(([k]) => parseKey(k).table === table)
      .map(([k, n]) => {
        deletedSent[k] = n;
        return parseKey(k).id;
      });
    if (!ids.length) continue;
    const { error: tErr } = await supabase.from('deleted_rows').insert(ids.map((row_id) => ({ user_id: userId, table_name: table, row_id })));
    fail(tErr, 'push tombstones');
    const { error } = await supabase.from(table).delete().in('id', ids);
    fail(error, `delete ${table}`);
  }

  let profileSent = 0;
  if (m.profileDirty) {
    profileSent = m.profileDirty;
    const { error } = await supabase.from('profiles').update(settingsToProfile(profileOf(useSettings.getState()))).eq('id', userId!);
    fail(error, 'push profile');
  }

  // Clear only what was sent and not edited again meanwhile.
  useMeta.setState((cur) => {
    const dirty = { ...cur.dirty };
    for (const [k, n] of Object.entries(sent)) if (dirty[k] === n) delete dirty[k];
    const deleted = { ...cur.deleted };
    for (const [k, n] of Object.entries(deletedSent)) if (deleted[k] === n) delete deleted[k];
    return { dirty, deleted, profileDirty: cur.profileDirty === profileSent ? 0 : cur.profileDirty };
  });
}

/** Task ids with changes still waiting to be sent ("waiting to sync" while offline). */
export function usePendingTaskIds(): Set<string> {
  const dirty = useMeta((m) => m.dirty);
  const ids = new Set<string>();
  for (const k of Object.keys(dirty)) if (k.startsWith('tasks:')) ids.add(k.slice(6));
  return ids;
}
