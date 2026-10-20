import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { overlayOpen } from '@/components/Sheet';
import { undoLast } from '@/components/Snackbar';
import { goMain } from '@/features/nav';
import { useTaskActions } from '@/features/useTaskActions';
import { useStore } from '@/store/store';
import { typingInField } from './dom';
import { closeOverlay, openQuickAdd, selectTask, useDeskState } from './state';

/** A screen-specific key handler (Inbox sorting, the check-in card). Return true if it used the key. */
export type KeyHandler = (key: string, e: KeyboardEvent) => boolean;
const handlers: KeyHandler[] = [];

/** Lets the current view take keys first (e.g. T = Today while sorting, instead of Tags). */
export function useViewKeys(handler: KeyHandler | null) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!handler) return;
    const fn: KeyHandler = (k, e) => ref.current?.(k, e) ?? false;
    handlers.unshift(fn);
    return () => {
      const i = handlers.indexOf(fn);
      if (i >= 0) handlers.splice(i, 1);
    };
  }, [!!handler]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * The computer's keys (WShortcuts is the source of truth). Single-letter keys don't fire while
 * typing in a field or while a dialog or menu is open.
 */
export function useDeskKeys() {
  const actions = useTaskActions();
  const path = usePathname();
  const latest = useRef({ actions, path });
  useEffect(() => {
    latest.current = { actions, path };
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      const { actions: a, path: p } = latest.current;
      const desk = useDeskState.getState();
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      // Pop-ups own the keyboard; Esc closes them.
      if (desk.overlay) {
        if (key === 'Escape') {
          e.preventDefault();
          closeOverlay();
        }
        return;
      }
      if (ctrl && key === 'z' && !typingInField()) {
        if (undoLast()) e.preventDefault();
        return;
      }
      if (overlayOpen() || typingInField() || e.altKey) return;

      for (const h of handlers) if (h(key, e)) return e.preventDefault();

      if (desk.goPending) {
        useDeskState.setState({ goPending: false });
        const to = key === 't' ? '/' : key === 'i' ? '/inbox' : key === 'c' ? '/calendar' : null;
        if (to) {
          e.preventDefault();
          goMain(to);
        }
        return;
      }

      const sel = desk.selected?.kind === 'task' ? desk.selected.id : null;
      const run = (fn: () => void) => {
        e.preventDefault();
        fn();
      };
      // Pop-ups with a text field open after the key press, so the letter doesn't land in the field.
      const later = (fn: () => void) => {
        e.preventDefault();
        setTimeout(fn, 0);
      };

      if (ctrl) {
        if (key === 'd' && sel) run(() => selectTask(useStore.getState().duplicateTask(sel)));
        return;
      }
      switch (key) {
        case 'q':
          return later(() => openQuickAdd({ list: p.startsWith('/list/') ? p.split('/')[2] : null }));
        case 'n':
          return later(() => {
            goMain('/inbox');
            useDeskState.setState({ focusDump: Date.now() });
          });
        case '/':
          return later(() => useDeskState.setState({ overlay: 'search' }));
        case '?':
          return run(() => useDeskState.setState({ overlay: 'shortcuts' }));
        case 'g':
          return run(() => useDeskState.setState({ goPending: true }));
        case 'ArrowDown':
        case 'ArrowUp': {
          const rows = desk.rows;
          if (!rows.length) return;
          const i = sel ? rows.indexOf(sel) : -1;
          const next = key === 'ArrowDown' ? Math.min(rows.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
          return run(() => selectTask(rows[next]));
        }
        case 'Escape':
          if (desk.selected) run(() => useDeskState.setState({ selected: null }));
          return;
      }
      if (!sel) return;
      switch (key) {
        case 'Enter':
          return run(() => selectTask(sel));
        case ' ':
          return run(() => a.toggle(sel));
        case 'd':
          return run(() => a.pickDate(sel));
        case 'm':
          return run(() => a.pickList(sel));
        case 'p':
          return run(() => a.pickPriority(sel));
        case 't':
          return run(() => a.pickTags(sel));
        case 'Delete':
        case 'Backspace':
          return run(() => {
            const rows = desk.rows;
            const i = rows.indexOf(sel);
            a.remove(sel);
            selectTask(rows[i + 1] ?? rows[i - 1] ?? null);
          });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
