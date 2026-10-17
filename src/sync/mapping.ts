// App objects ⇄ Supabase rows (camelCase ⇄ snake_case). Pure; tested in tests/sync.test.ts.
import type { InboxItem, List, Note, Tag, Task } from '../store/types.ts';

export type Table = 'lists' | 'tasks' | 'tags' | 'inbox_items' | 'notes';
export type Row = Record<string, unknown>;

/** Push order respects foreign keys (tasks point at lists). Deletes go the other way. */
export const PUSH_ORDER: Table[] = ['lists', 'tags', 'tasks', 'inbox_items', 'notes'];
export const DELETE_ORDER: Table[] = ['tasks', 'inbox_items', 'notes', 'tags', 'lists'];

/** Store collection name for each table. */
export const COLLECTION = { lists: 'lists', tasks: 'tasks', tags: 'tags', inbox_items: 'inbox', notes: 'notes' } as const;

const iso = (v: unknown) => (v == null ? null : new Date(String(v)).toISOString());
const hhmm = (v: unknown) => (v == null ? null : String(v).slice(0, 5));

export function toRow(table: Table, x: List | Task | Tag | InboxItem | Note, userId: string): Row {
  switch (table) {
    case 'lists': {
      const l = x as List;
      return { id: l.id, user_id: userId, name: l.name, color: l.color, sort_order: l.sortOrder, sort_by: l.sortBy, show_done: l.showDone, archived_at: l.archivedAt, deleted_at: l.deletedAt, created_at: l.createdAt };
    }
    case 'tasks': {
      const t = x as Task;
      return {
        id: t.id,
        user_id: userId,
        list_id: t.listId,
        title: t.title,
        notes: t.notes,
        due_date: t.dueDate,
        start_time: t.startTime,
        end_time: t.endTime,
        priority: t.priority,
        reminder_minutes: t.reminderMinutes,
        repeat_rule: t.repeatRule,
        carried_over_count: t.carriedOverCount,
        sort_order: t.sortOrder,
        subtasks: t.subtasks,
        tag_ids: t.tagIds,
        done_at: t.doneAt,
        deleted_at: t.deletedAt,
        created_at: t.createdAt,
      };
    }
    case 'tags': {
      const g = x as Tag;
      return { id: g.id, user_id: userId, name: g.name, created_at: g.createdAt };
    }
    case 'inbox_items': {
      const i = x as InboxItem;
      return { id: i.id, user_id: userId, text: i.text, sorted_at: i.sortedAt, sorted_outcome: i.sortedOutcome, sorted_ref_id: i.sortedRefId, deleted_at: i.deletedAt, created_at: i.createdAt };
    }
    case 'notes': {
      const n = x as Note;
      return { id: n.id, user_id: userId, title: n.title, body: n.body, pinned: n.pinned, from_inbox: n.fromInbox, deleted_at: n.deletedAt, created_at: n.createdAt };
    }
  }
}

export function fromRow(table: Table, r: Row): List | Task | Tag | InboxItem | Note {
  const updatedAt = iso(r.updated_at) ?? new Date().toISOString();
  const createdAt = iso(r.created_at) ?? updatedAt;
  switch (table) {
    case 'lists':
      return {
        id: String(r.id),
        name: String(r.name),
        color: r.color as List['color'],
        sortOrder: Number(r.sort_order ?? 0),
        sortBy: (r.sort_by as List['sortBy']) ?? 'date',
        showDone: !!r.show_done,
        archivedAt: iso(r.archived_at),
        deletedAt: iso(r.deleted_at),
        createdAt,
        updatedAt,
      };
    case 'tasks':
      return {
        id: String(r.id),
        listId: (r.list_id as string) ?? null,
        title: String(r.title),
        notes: (r.notes as string) ?? '',
        dueDate: (r.due_date as string) ?? null,
        startTime: hhmm(r.start_time),
        endTime: hhmm(r.end_time),
        priority: Number(r.priority ?? 0) as Task['priority'],
        reminderMinutes: r.reminder_minutes == null ? null : Number(r.reminder_minutes),
        repeatRule: (r.repeat_rule as string) ?? null,
        carriedOverCount: Number(r.carried_over_count ?? 0),
        sortOrder: Number(r.sort_order ?? 0),
        subtasks: (r.subtasks as Task['subtasks']) ?? [],
        tagIds: (r.tag_ids as string[]) ?? [],
        doneAt: iso(r.done_at),
        deletedAt: iso(r.deleted_at),
        createdAt,
        updatedAt,
      };
    case 'tags':
      return { id: String(r.id), name: String(r.name), createdAt };
    case 'inbox_items':
      return {
        id: String(r.id),
        text: String(r.text),
        sortedAt: iso(r.sorted_at),
        sortedOutcome: (r.sorted_outcome as InboxItem['sortedOutcome']) ?? null,
        sortedRefId: (r.sorted_ref_id as string) ?? null,
        deletedAt: iso(r.deleted_at),
        createdAt,
        updatedAt,
      };
    case 'notes':
      return {
        id: String(r.id),
        title: (r.title as string) ?? '',
        body: (r.body as Note['body']) ?? [],
        pinned: !!r.pinned,
        fromInbox: !!r.from_inbox,
        deletedAt: iso(r.deleted_at),
        createdAt,
        updatedAt,
      };
  }
}

/** Ids whose object changed (new or edited) and ids that disappeared between two snapshots. */
export function diff<T extends { id: string }>(prev: T[], next: T[]): { changed: string[]; removed: string[] } {
  const before = new Map(prev.map((x) => [x.id, x]));
  const changed: string[] = [];
  for (const x of next) {
    if (before.get(x.id) !== x) changed.push(x.id);
    before.delete(x.id);
  }
  return { changed, removed: [...before.keys()] };
}

/**
 * First sign-in on a device: the account already has its own Work / Personal / Learning lists.
 * Local lists with the same name are folded into the account's, so nothing is duplicated.
 * Returns the local→account id map.
 */
export function matchListsByName(local: List[], remote: List[]): Map<string, string> {
  const byName = new Map(remote.filter((l) => !l.deletedAt).map((l) => [l.name.trim().toLowerCase(), l.id]));
  const map = new Map<string, string>();
  for (const l of local) {
    const hit = byName.get(l.name.trim().toLowerCase());
    if (hit && hit !== l.id) map.set(l.id, hit);
  }
  return map;
}

/** Settings ⇄ profile row. A null time means that check-in is off. */
export type ProfileSettings = {
  theme: 'system' | 'light' | 'dark';
  weekStart: 0 | 1;
  timeFormat: '24h' | '12h';
  morningTime: string | null;
  afternoonTime: string | null;
  sortTime: string | null;
  fullScreen: boolean;
  weekends: boolean;
};

export function settingsToProfile(s: ProfileSettings): Row {
  return {
    theme: s.theme,
    week_start: s.weekStart,
    time_format: s.timeFormat,
    morning_time: s.morningTime,
    afternoon_time: s.afternoonTime,
    sort_time: s.sortTime,
    full_screen_enabled: s.fullScreen,
    weekends_enabled: s.weekends,
  };
}

export function profileToSettings(r: Row): ProfileSettings {
  return {
    theme: (r.theme as ProfileSettings['theme']) ?? 'system',
    weekStart: Number(r.week_start ?? 0) === 1 ? 1 : 0,
    timeFormat: r.time_format === '12h' ? '12h' : '24h',
    morningTime: hhmm(r.morning_time),
    afternoonTime: hhmm(r.afternoon_time),
    sortTime: hhmm(r.sort_time),
    fullScreen: !!r.full_screen_enabled,
    weekends: !!r.weekends_enabled,
  };
}
