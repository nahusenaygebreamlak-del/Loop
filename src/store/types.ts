import type { DateKey, TimeKey } from '../lib/dates.ts';
import type { Priority } from '../lib/parse.ts';

// Mirrors the Supabase tables (supabase/migrations) in camelCase, so sync (Milestone 4) is a straight mapping.

export type ListColor = 'work' | 'personal' | 'learning' | 'purple' | 'pink' | 'slate';

export type List = {
  id: string;
  name: string;
  color: ListColor;
  sortOrder: number;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Subtask = { id: string; title: string; doneAt: string | null; sortOrder: number };

export type Task = {
  id: string;
  listId: string | null;
  title: string;
  notes: string;
  dueDate: DateKey | null;
  startTime: TimeKey | null;
  endTime: TimeKey | null;
  priority: Priority;
  reminderMinutes: number | null;
  repeatRule: string | null;
  carriedOverCount: number;
  sortOrder: number;
  tagIds: string[];
  subtasks: Subtask[];
  doneAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Tag = { id: string; name: string; createdAt: string };

export type InboxItem = {
  id: string;
  text: string;
  sortedAt: string | null;
  sortedOutcome: 'task' | 'note' | 'deleted' | null;
  sortedRefId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoteBlock = { type: 'text'; text: string } | { type: 'checklist'; text: string; done: boolean };

export type Note = {
  id: string;
  title: string;
  body: NoteBlock[];
  pinned: boolean;
  fromInbox: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
