import { create } from 'zustand';

// What the computer layout is showing besides the route: the detail panel's selection,
// the ☰ sidebar on narrow windows, and which pop-up is open.

export type DeskSelection =
  | { kind: 'task'; id: string }
  | { kind: 'event'; id: string }
  | { kind: 'trash'; entry: 'task' | 'inbox' | 'note'; id: string }
  | { kind: 'sort'; id: string };

export type DeskOverlay = 'quick' | 'search' | 'shortcuts' | 'welcome' | null;

type DeskState = {
  selected: DeskSelection | null;
  /** Narrow windows: the ☰ sidebar is open. */
  sideOpen: boolean;
  overlay: DeskOverlay;
  /** Text to start the quick-add bar with (e.g. "#design "). */
  quickText: string;
  quickDate: string | null;
  quickList: string | null;
  /** Ids of the rows on screen, in order, for ↑ / ↓. Set by the current view. */
  rows: string[];
  /** "G" was pressed; the next key picks where to go. */
  goPending: boolean;
  /** N: focus the Inbox's "Dump a thought" field (a changing stamp). */
  focusDump: number;
};

export const useDeskState = create<DeskState>(() => ({
  selected: null,
  sideOpen: false,
  overlay: null,
  quickText: '',
  quickDate: null,
  quickList: null,
  rows: [],
  goPending: false,
  focusDump: 0,
}));

export const selectTask = (id: string | null) => useDeskState.setState({ selected: id ? { kind: 'task', id } : null });
export const openQuickAdd = (opts: { text?: string; date?: string | null; list?: string | null } = {}) =>
  useDeskState.setState({ overlay: 'quick', quickText: opts.text ?? '', quickDate: opts.date ?? null, quickList: opts.list ?? null });
export const closeOverlay = () => useDeskState.setState({ overlay: null });
