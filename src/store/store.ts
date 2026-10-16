import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { nextOccurrence } from '@/lib/repeat';
import type { InboxItem, List, ListColor, Note, Subtask, Tag, Task } from './types';

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
  addInboxItem: (text: string) => string;
  /** Hard removal, used by Undo right after capture. */
  removeInboxItem: (id: string) => void;
  /** "Turn into a note". Returns an undo function. */
  taskToNote: (id: string) => () => void;
  /** "Back to Inbox": the task becomes an Inbox note again. Returns an undo function. */
  taskBackToInbox: (id: string) => () => void;
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
              ...(t.notes ? [{ type: 'text' as const, text: t.notes }] : []),
              ...t.subtasks.map((st) => ({ type: 'checklist' as const, text: st.title, done: !!st.doneAt })),
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
      };
    },
    {
      name: 'loop.data.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ lists, tasks, tags, inbox, notes }) => ({ lists, tasks, tags, inbox, notes }),
      onRehydrateStorage: () => (state) => state?.seedDefaults(),
    },
  ),
);

const subscribeHydration = (cb: () => void) => useStore.persist.onFinishHydration(cb);
const getHydrated = () => useStore.persist.hasHydrated();

/** True once saved data has been read from the device. */
export function useHydrated() {
  return useSyncExternalStore(subscribeHydration, getHydrated, getHydrated);
}

