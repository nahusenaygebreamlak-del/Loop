import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Browser-only helpers for the computer layout. React Native Web views are real DOM
// elements, so drag-and-drop and right-click are wired straight onto them.

export type DragPayload = { kind: 'task'; id: string };
let current: DragPayload | null = null;
export const currentDrag = () => current;

const el = (r: unknown) => (Platform.OS === 'web' ? (r as HTMLElement | null) : null);

/** Makes a view draggable (a task row). */
export function useDraggable<T>(payload: DragPayload | null) {
  const ref = useRef<T>(null);
  const data = useRef(payload);
  useEffect(() => {
    data.current = payload;
  });
  useEffect(() => {
    const node = el(ref.current);
    if (!node || !data.current) return;
    node.setAttribute('draggable', 'true');
    const start = (e: DragEvent) => {
      current = data.current;
      e.dataTransfer?.setData('text/plain', current ? `${current.kind}:${current.id}` : '');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    };
    const end = () => {
      setTimeout(() => (current = null), 0);
    };
    node.addEventListener('dragstart', start);
    node.addEventListener('dragend', end);
    return () => {
      node.removeEventListener('dragstart', start);
      node.removeEventListener('dragend', end);
    };
  }, [payload?.id]);
  return ref;
}

/** A drop target (sidebar list or tag, a day, a calendar slot). `over` highlights it. */
export function useDropTarget<T>(onDrop: (p: DragPayload, e: DragEvent) => void, enabled = true) {
  const ref = useRef<T>(null);
  const [over, setOver] = useState(false);
  const cb = useRef(onDrop);
  useEffect(() => {
    cb.current = onDrop;
  });
  useEffect(() => {
    const node = el(ref.current);
    if (!node || !enabled) return;
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!current) return;
      e.preventDefault();
      depth++;
      setOver(true);
    };
    const overFn = (e: DragEvent) => {
      if (!current) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setOver(false);
    };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setOver(false);
      if (current) cb.current(current, e);
    };
    node.addEventListener('dragenter', enter);
    node.addEventListener('dragover', overFn);
    node.addEventListener('dragleave', leave);
    node.addEventListener('drop', drop);
    return () => {
      node.removeEventListener('dragenter', enter);
      node.removeEventListener('dragover', overFn);
      node.removeEventListener('dragleave', leave);
      node.removeEventListener('drop', drop);
    };
  }, [enabled]);
  return [ref, over] as const;
}

/** Right-click on a view. */
export function useContextMenu<T>(onMenu: (x: number, y: number) => void) {
  const ref = useRef<T>(null);
  const cb = useRef(onMenu);
  useEffect(() => {
    cb.current = onMenu;
  });
  useEffect(() => {
    const node = el(ref.current);
    if (!node) return;
    const fn = (e: MouseEvent) => {
      e.preventDefault();
      cb.current(e.clientX, e.clientY);
    };
    node.addEventListener('contextmenu', fn);
    return () => node.removeEventListener('contextmenu', fn);
  }, []);
  return ref;
}

/** True while focus is in a text field (single-letter keys must not fire then). */
export function typingInField(): boolean {
  if (Platform.OS !== 'web') return false;
  const a = document.activeElement as HTMLElement | null;
  if (!a) return false;
  const tag = a.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || a.isContentEditable;
}
