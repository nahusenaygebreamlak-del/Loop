import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { nextOccurrence } from '@/lib/repeat';
import { useLocal } from './local';
import type { InboxItem, List, ListColor, Note, Subtask, Tag, Task } from './types';

export type TrashKind = 'task' | 'inbox' | 'note';
const TRASH_DAYS = 30;

// Local, offline-first data. Everything lives on the device; Supabase sync arrives in Milestone 4.

type Data = {
  lists: List[];
  tasks: Task[];
  tags: Tag[];
  inbox: InboxItem[];
  notes: Note[];
};

export type NewTask = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> & { title: string };

type Actions = {
  seedDefaults: () => void;
  addTask: (t: NewTask) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  /** Ticks or unticks. Returns an undo function. */
  toggleDone: (id: string) => () => void;
  /** Moves to Trash. Returns an undo function. */
  deleteTask: (id: string) => () => void;
  duplicateTask: (id: string) => string | null;
  /** Hard removal, used by Undo right after quick add. */
  discardTask: (id: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  /** Returns the tag id, creating the tag if needed. */
  ensureTag: (name: string) => string;
  /** Renames on every task; merges into an existing tag of that name. Returns the tag id now used. */
  renameTag: (id: string, name: string) => string;
  /** Removes the tag from every task (tasks stay). */
  deleteTag: (id: string) => void;
  addInboxItem: (text: string) => string;
  /** Hard removal, used by Undo right after capture. */
  removeInboxItem: (id: string) => void;
  /** "Turn into a note". Returns an undo function. */
  taskToNote: (id: string) => () => void;
  /** "Back to Inbox": the task becomes an Inbox note again. Returns an undo function. */
  taskBackToInbox: (id: string) => () => void;

  updateInboxItem: (id: string, text: string) => void;
  /**
   * Sorts an Inbox note (NSortNote): into a task, into Notes, or to Trash.
   * The item stays with sortedAt so it can be undone until midnight.
   */
  sortInbox: (id: string, outcome: 'task' | 'note' | 'deleted', task?: NewTask) => string | null;
  /** Undo sorting: puts the note back in the Inbox and removes what it became. */
  unsortInbox: (id: string) => void;

  addNote: (n?: Partial<Note>) => string;
  updateNote: (id: string, patch: Partial<Note>) => void;
  /** Moves to Trash. Returns an undo function. */
  deleteNote: (id: string) => () => void;
  /** Hard removal (an empty note being left). */
  discardNote: (id: string) => void;
  duplicateNote: (id: string) => string | null;
  /** "Make a task": text becomes the task's notes, checklist items become subtasks. Returns the task id. */
  noteToTask: (id: string) => string | null;

  /** Check-in result: new dates / done states for several tasks at once (also used for Undo). */
  applyCheckin: (changes: { id: string; dueDate: string | null; doneAt: string | null; carriedOverCount: number; carriedAt: string | null }[]) => void;

  addList: (name: string, color: ListColor) => string;
  updateList: (id: string, patch: Partial<List>) => void;
  /** Hides the list and its tasks. Returns an undo function. */
  archiveList: (id: string) => () => void;
  /** Sends the list's tasks to Trash. Returns an undo function. */
  deleteList: (id: string) => () => void;

  /** Restores a Trash item (a task also brings back its deleted list). */
  restore: (kind: TrashKind, id: string) => void;
  /** Deletes a Trash item for good. */
  purge: (kind: TrashKind, id: string) => void;
  emptyTrash: () => void;
  /** Deletes anything that has been in Trash for 30 days. */
  purgeExpired: (now?: Date) => void;
};

export type Store = Data & Actions;

const now = () => new Date().toISOString();

const DEFAULT_LISTS: [string, ListColor][] = [
  ['Work', 'work'],
  ['Personal', 'personal'],
  ['Learning', 'learning'],
];

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const patchTask = (id: string, patch: Partial<Task>) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now() } : t)) }));
      const removeTask = (id: string) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      const putTask = (task: Task) =>
        set((s) => ({ tasks: s.tasks.some((t) => t.id === task.id) ? s.tasks.map((t) => (t.id === task.id ? task : t)) : [...s.tasks, task] }));

      return {
        lists: [],
        tasks: [],
        tags: [],
        inbox: [],
        notes: [],

        seedDefaults: () => {
          if (get().lists.length) return;
          const ts = now();
          set({
            lists: DEFAULT_LISTS.map(([name, color], i) => ({
              id: randomUUID(),
              name,
              color,
              sortOrder: i,
              sortBy: 'date' as const,
              showDone: false,
              archivedAt: null,
              deletedAt: null,
              createdAt: ts,
              updatedAt: ts,
            })),
          });
        },

        addTask: (t) => {
          const ts = now();
          const task: Task = {
            id: randomUUID(),
            listId: null,
            notes: '',
            dueDate: null,
            startTime: null,
            endTime: null,
            priority: 0,
            reminderMinutes: null,
            repeatRule: null,
            carriedOverCount: 0,
            carriedAt: null,
            sortOrder: get().tasks.length,
            tagIds: [],
            subtasks: [],
            doneAt: null,
            deletedAt: null,
            ...t,
            createdAt: ts,
            updatedAt: ts,
          };
          set((s) => ({ tasks: [...s.tasks, task] }));
          return task.id;
        },

        updateTask: patchTask,

        toggleDone: (id) => {
          const before = get().tasks.find((t) => t.id === id);
          if (!before) return () => {};
          if (before.doneAt) {
            patchTask(id, { doneAt: null });
            return () => patchTask(id, { doneAt: before.doneAt });
          }
          patchTask(id, { doneAt: now() });
          // A repeating task makes its next occurrence when ticked.
          const next = before.dueDate ? nextOccurrence(before.repeatRule, before.dueDate) : null;
          const nextId = next
            ? get().addTask({
                ...before,
                dueDate: next,
                doneAt: null,
                carriedOverCount: 0,
                carriedAt: null,
                subtasks: before.subtasks.map((st) => ({ ...st, id: randomUUID(), doneAt: null })),
              })
            : null;
          return () => {
            putTask(before);
            if (nextId) removeTask(nextId);
          };
        },

        deleteTask: (id) => {
          const before = get().tasks.find((t) => t.id === id);
          if (!before) return () => {};
          patchTask(id, { deletedAt: now() });
          return () => putTask(before);
        },

        duplicateTask: (id) => {
          const t = get().tasks.find((x) => x.id === id);
          if (!t) return null;
          return get().addTask({
            ...t,
            doneAt: null,
            deletedAt: null,
            subtasks: t.subtasks.map((st) => ({ ...st, id: randomUUID() })),
          });
        },

        discardTask: removeTask,

        addSubtask: (taskId, title) => {
          const t = get().tasks.find((x) => x.id === taskId);
          if (!t || !title.trim()) return;
          const sub: Subtask = { id: randomUUID(), title: title.trim(), doneAt: null, sortOrder: t.subtasks.length };
          patchTask(taskId, { subtasks: [...t.subtasks, sub] });
        },

        toggleSubtask: (taskId, subId) => {
          const t = get().tasks.find((x) => x.id === taskId);
          if (!t) return;
          patchTask(taskId, {
            subtasks: t.subtasks.map((st) => (st.id === subId ? { ...st, doneAt: st.doneAt ? null : now() } : st)),
          });
        },

        ensureTag: (name) => {
          const clean = name.replace(/^#/, '').trim().toLowerCase();
          const existing = get().tags.find((t) => t.name === clean);
          if (existing) return existing.id;
          const tag: Tag = { id: randomUUID(), name: clean, createdAt: now() };
          set((s) => ({ tags: [...s.tags, tag] }));
          return tag.id;
        },

        renameTag: (id, name) => {
          const clean = name.replace(/^#/, '').trim().toLowerCase().replace(/\s+/g, '-');
          const tag = get().tags.find((t) => t.id === id);
          if (!tag || !clean || clean === tag.name) return id;
          const other = get().tags.find((t) => t.name === clean && t.id !== id);
          if (!other) {
            set((s) => ({ tags: s.tags.map((t) => (t.id === id ? { ...t, name: clean } : t)) }));
            return id;
          }
          for (const t of get().tasks) {
            if (t.tagIds.includes(id)) patchTask(t.id, { tagIds: [...new Set(t.tagIds.map((x) => (x === id ? other.id : x)))] });
          }
          set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }));
          return other.id;
        },

        deleteTag: (id) => {
          for (const t of get().tasks) if (t.tagIds.includes(id)) patchTask(t.id, { tagIds: t.tagIds.filter((x) => x !== id) });
          set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }));
        },

        addInboxItem: (text) => {
          const ts = now();
          const item: InboxItem = {
            id: randomUUID(),
            text,
            sortedAt: null,
            sortedOutcome: null,
            sortedRefId: null,
            deletedAt: null,
            createdAt: ts,
            updatedAt: ts,
          };
          set((s) => ({ inbox: [item, ...s.inbox] }));
          return item.id;
        },

        removeInboxItem: (id) => set((s) => ({ inbox: s.inbox.filter((i) => i.id !== id) })),

        taskToNote: (id) => {
          const t = get().tasks.find((x) => x.id === id);
          if (!t) return () => {};
          const ts = now();
          const note: Note = {
            id: randomUUID(),
            title: t.title,
            body: [
              ...(t.notes ? [{ id: randomUUID(), type: 'text' as const, text: t.notes }] : []),
              ...t.subtasks.map((st) => ({ id: randomUUID(), type: 'checklist' as const, text: st.title, done: !!st.doneAt })),
            ],
            pinned: false,
            fromInbox: false,
            deletedAt: null,
            createdAt: ts,
            updatedAt: ts,
          };
          set((s) => ({ notes: [note, ...s.notes], tasks: s.tasks.filter((x) => x.id !== id) }));
          return () => set((s) => ({ notes: s.notes.filter((n) => n.id !== note.id), tasks: [...s.tasks, t] }));
        },

        taskBackToInbox: (id) => {
          const t = get().tasks.find((x) => x.id === id);
          if (!t) return () => {};
          removeTask(id);
          const inboxId = get().addInboxItem(t.title);
          return () => {
            get().removeInboxItem(inboxId);
            putTask(t);
          };
        },

        updateInboxItem: (id, text) =>
          set((s) => ({ inbox: s.inbox.map((i) => (i.id === id ? { ...i, text, updatedAt: now() } : i)) })),

        sortInbox: (id, outcome, task) => {
          const item = get().inbox.find((i) => i.id === id);
          if (!item) return null;
          const ts = now();
          let ref: string | null = null;
          if (outcome === 'task') ref = get().addTask({ title: item.text, ...task } as NewTask);
          if (outcome === 'note') ref = get().addNote({ title: item.text, fromInbox: true });
          set((s) => ({
            inbox: s.inbox.map((i) =>
              i.id === id
                ? { ...i, sortedAt: ts, sortedOutcome: outcome, sortedRefId: ref, deletedAt: outcome === 'deleted' ? ts : null, updatedAt: ts }
                : i,
            ),
          }));
          return ref;
        },

        unsortInbox: (id) => {
          const item = get().inbox.find((i) => i.id === id);
          if (!item?.sortedAt) return;
          const ref = item.sortedRefId;
          set((s) => ({
            tasks: item.sortedOutcome === 'task' ? s.tasks.filter((t) => t.id !== ref) : s.tasks,
            notes: item.sortedOutcome === 'note' ? s.notes.filter((n) => n.id !== ref) : s.notes,
            inbox: s.inbox.map((i) =>
              i.id === id ? { ...i, sortedAt: null, sortedOutcome: null, sortedRefId: null, deletedAt: null, updatedAt: now() } : i,
            ),
          }));
        },

        addNote: (n = {}) => {
          const ts = now();
          const note: Note = { id: randomUUID(), title: '', body: [], pinned: false, fromInbox: false, deletedAt: null, ...n, createdAt: ts, updatedAt: ts };
          set((s) => ({ notes: [note, ...s.notes] }));
          return note.id;
        },

        updateNote: (id, patch) =>
          set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)) })),

        deleteNote: (id) => {
          const before = get().notes.find((n) => n.id === id);
          get().updateNote(id, { deletedAt: now() });
          return () => before && set((s) => ({ notes: s.notes.map((n) => (n.id === id ? before : n)) }));
        },

        discardNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

        duplicateNote: (id) => {
          const n = get().notes.find((x) => x.id === id);
          if (!n) return null;
          return get().addNote({ title: n.title ? `${n.title} (copy)` : '', body: n.body.map((b) => ({ ...b, id: randomUUID() })), fromInbox: n.fromInbox });
        },

        noteToTask: (id) => {
          const n = get().notes.find((x) => x.id === id);
          if (!n) return null;
          const text = n.body.filter((b) => b.type !== 'checklist').map((b) => (b.type === 'bullet' ? `• ${b.text}` : b.text)).filter(Boolean).join('\n');
          const subtasks: Subtask[] = n.body
            .filter((b) => b.type === 'checklist' && b.text.trim())
            .map((b, i) => ({ id: randomUUID(), title: b.text, doneAt: b.done ? now() : null, sortOrder: i }));
          const taskId = get().addTask({ title: n.title || text.split('\n')[0] || 'Untitled', notes: n.title ? text : '', subtasks });
          set((s) => ({ notes: s.notes.filter((x) => x.id !== id) }));
          return taskId;
        },

        applyCheckin: (changes) => {
          for (const c of changes) {
            const t = get().tasks.find((x) => x.id === c.id);
            if (!t) continue;
            // Ticking a repeating task makes its next occurrence, as everywhere else.
            if (c.doneAt && !t.doneAt && t.repeatRule) {
              get().toggleDone(c.id);
              continue;
            }
            patchTask(c.id, { dueDate: c.dueDate, doneAt: c.doneAt, carriedOverCount: c.carriedOverCount, carriedAt: c.carriedAt });
          }
        },

        addList: (name, color) => {
          const ts = now();
          const list: List = {
            id: randomUUID(),
            name: name.trim(),
            color,
            sortOrder: Math.max(-1, ...get().lists.map((l) => l.sortOrder)) + 1,
            sortBy: 'date',
            showDone: false,
            archivedAt: null,
            deletedAt: null,
            createdAt: ts,
            updatedAt: ts,
          };
          set((s) => ({ lists: [...s.lists, list] }));
          return list.id;
        },

        updateList: (id, patch) =>
          set((s) => ({ lists: s.lists.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: now() } : l)) })),

        archiveList: (id) => {
          const before = get().lists.find((l) => l.id === id);
          get().updateList(id, { archivedAt: now() });
          return () => before && get().updateList(id, { archivedAt: before.archivedAt });
        },

        deleteList: (id) => {
          const ts = now();
          const prevTasks = get().tasks;
          const prevLists = get().lists;
          set((s) => ({
            lists: s.lists.map((l) => (l.id === id ? { ...l, deletedAt: ts, updatedAt: ts } : l)),
            // Same timestamp, so restoring the list's tasks together is possible later.
            tasks: s.tasks.map((t) => (t.listId === id && !t.deletedAt ? { ...t, deletedAt: ts, updatedAt: ts } : t)),
          }));
          return () => set({ tasks: prevTasks, lists: prevLists });
        },

        restore: (kind, id) => {
          const ts = now();
          if (kind === 'task') {
            const t = get().tasks.find((x) => x.id === id);
            set((s) => ({
              tasks: s.tasks.map((x) => (x.id === id ? { ...x, deletedAt: null, updatedAt: ts } : x)),
              lists: s.lists.map((l) => (l.id === t?.listId && l.deletedAt ? { ...l, deletedAt: null, updatedAt: ts } : l)),
            }));
          } else if (kind === 'inbox') {
            set((s) => ({ inbox: s.inbox.map((x) => (x.id === id ? { ...x, deletedAt: null, updatedAt: ts } : x)) }));
          } else {
            set((s) => ({ notes: s.notes.map((x) => (x.id === id ? { ...x, deletedAt: null, updatedAt: ts } : x)) }));
          }
        },

        purge: (kind, id) => {
          if (kind === 'task') set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) }));
          else if (kind === 'inbox') set((s) => ({ inbox: s.inbox.filter((x) => x.id !== id) }));
          else set((s) => ({ notes: s.notes.filter((x) => x.id !== id) }));
        },

        emptyTrash: () =>
          set((s) => ({
            tasks: s.tasks.filter((x) => !x.deletedAt),
            inbox: s.inbox.filter((x) => !x.deletedAt),
            notes: s.notes.filter((x) => !x.deletedAt),
            lists: s.lists.filter((l) => !l.deletedAt || s.tasks.some((t) => t.listId === l.id && !t.deletedAt)),
          })),

        purgeExpired: (at = new Date()) => {
          const cutoff = at.getTime() - TRASH_DAYS * 86_400_000;
          const keep = (x: { deletedAt: string | null }) => !x.deletedAt || new Date(x.deletedAt).getTime() > cutoff;
          set((s) => ({ tasks: s.tasks.filter(keep), inbox: s.inbox.filter(keep), notes: s.notes.filter(keep), lists: s.lists.filter(keep) }));
        },
      };
    },
    {
      name: 'loop.data.v1',
      version: 3,
      migrate: (state, version) => {
        const s = state as Data;
        // v1 lists had no sort/show-done settings.
        if (version < 2) s.lists = s.lists.map((l) => ({ ...l, sortBy: l.sortBy ?? 'date', showDone: l.showDone ?? false }));
        // v3 note blocks carry ids.
        if (version < 3) s.notes = s.notes.map((n) => ({ ...n, body: n.body.map((b) => ({ ...b, id: b.id ?? randomUUID() })) }));
        return s;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ lists, tasks, tags, inbox, notes }) => ({ lists, tasks, tags, inbox, notes }),
      onRehydrateStorage: () => (state) => {
        state?.seedDefaults();
        state?.purgeExpired();
      },
    },
  ),
);

const subscribeHydration = (cb: () => void) => {
  const a = useStore.persist.onFinishHydration(cb);
  const b = useLocal.persist.onFinishHydration(cb);
  return () => {
    a();
    b();
  };
};
const getHydrated = () => useStore.persist.hasHydrated() && useLocal.persist.hasHydrated();

/** True once saved data has been read from the device. */
/** Resolves once saved data has been read (for code running outside React, e.g. notification buttons). */
export function whenHydrated(): Promise<void> {
  return new Promise((resolve) => {
    if (useStore.persist.hasHydrated()) return resolve();
    const unsub = useStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

export function useHydrated() {
  return useSyncExternalStore(subscribeHydration, getHydrated, getHydrated);
}

