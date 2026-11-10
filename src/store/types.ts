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

/** Season tier of a list (docs/13 §2.1). A list with no tier counts as Support. */
export type Tier = 'core' | 'secondary' | 'support';

/** A stretch of weeks in which each list is Core, Secondary or Support. Only one is active at a time. */
export type Season = {
  id: string;
  /** Null shows as "Season 1", "Season 2"… */
  name: string | null;
  startDate: DateKey;
  endDate: DateKey;
  /** Set when the season was ended early. */
  endedAt: string | null;
  /** List id → tier. Lists that aren't here are Support. */
  tiers: Record<string, Tier>;
  createdAt: string;
  updatedAt: string;
};

/** What was done with the leftovers in a day's debrief. */
export type LeftoversAction = 'today' | 'done' | 'archive' | 'reschedule' | 'not_now' | 'notif_today' | 'notif_done';

/**
 * One morning debrief (docs/13 §2.2). Two devices may each make a row for the same day;
 * the day counts as answered when any of them is.
 */
export type Debrief = {
  id: string;
  day: DateKey;
  openedAt: string | null;
  answeredAt: string | null;
  leftoversAction: LeftoversAction | null;
  /** The coach's checked plan for the day (docs/13 §2.3), shared by phone and computer. */
  plan: DayPlan | null;
  /** How many times "Plan again" was used that day (at most 5). */
  planRuns: number;
  planState: PlanState;
  createdAt: string;
  updatedAt: string;
};

export type PlanSuggestion = { taskId: string; kind: 'schedule' | 'today' | 'later'; start?: TimeKey; end?: TimeKey; date?: DateKey; reason: string };
export type DayPlan = { summary: string; suggestions: PlanSuggestion[] };
/** Which suggestions were accepted, and whether "Not today" hid the plan. */
export type PlanState = { accepted?: string[]; dismissed?: boolean };
