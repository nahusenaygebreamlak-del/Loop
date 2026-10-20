import type { DateKey, TimeKey } from '../lib/dates.ts';
import type { Priority } from '../lib/parse.ts';

// Mirrors the Supabase tables (supabase/migrations) in camelCase, so sync (Milestone 4) is a straight mapping.

export type ListColor = 'work' | 'personal' | 'learning' | 'purple' | 'pink' | 'slate';

export type List = {
  id: string;
  name: string;
  color: ListColor;
  sortOrder: number;
  sortBy: ListSort;
  showDone: boolean;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListSort = 'date' | 'priority' | 'title';

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
  /** The day a check-in last moved this task (Today shows it under "From yesterday"). */
  carriedAt: DateKey | null;
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

export type NoteBlockType = 'text' | 'heading' | 'bullet' | 'checklist';
export type NoteBlock = { id: string; type: NoteBlockType; text: string; done?: boolean; bold?: boolean; /** Computer: the line was turned into this task (Ctrl Enter). */ taskId?: string };

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
