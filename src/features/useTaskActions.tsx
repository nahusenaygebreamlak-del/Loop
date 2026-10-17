import { router } from 'expo-router';
import { useCallback } from 'react';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { useStore } from '@/store/store';
import type { Task } from '@/store/types';
import { DateSheet, type DateValue } from './sheets/DateSheet';
import { ListSheet } from './sheets/ListSheet';
import { PrioritySheet } from './sheets/PrioritySheet';
import { TagsSheet } from './sheets/TagsSheet';

/** Shared task behaviour: tick with Undo, delete to Trash with Undo, and the picker sheets. */
export function useTaskActions() {
  const sheets = useSheets();
  const snack = useSnackbar();
  const toggleDone = useStore((s) => s.toggleDone);
  const deleteTask = useStore((s) => s.deleteTask);
  const updateTask = useStore((s) => s.updateTask);

  const get = (id: string) => useStore.getState().tasks.find((t) => t.id === id);

  const toggle = useCallback(
    (id: string) => {
      const wasDone = !!get(id)?.doneAt;
      const undo = toggleDone(id);
      if (!wasDone) snack({ title: 'Task done', actions: [{ label: 'Undo', onPress: undo }] });
    },
    [toggleDone, snack],
  );

  const remove = useCallback(
    (id: string) => {
      const undo = deleteTask(id);
      snack({ title: 'Task moved to Trash', sub: 'Kept for 30 days', actions: [{ label: 'Undo', onPress: undo }] });
    },
    [deleteTask, snack],
  );

  const openDetails = useCallback((id: string) => router.push({ pathname: '/task/[id]', params: { id } }), []);

  const pickDate = useCallback(
    (id: string) => {
      const t = get(id);
      if (!t) return;
      const value: DateValue = { dueDate: t.dueDate, startTime: t.startTime, endTime: t.endTime, reminderMinutes: t.reminderMinutes, repeatRule: t.repeatRule };
      sheets.open(() => <DateSheet title={useStore.getState().tasks.find((t) => t.id === id)?.title} value={value} onChange={(v) => updateTask(id, v)} />);
    },
    [sheets, updateTask],
  );

  const pickList = useCallback(
    (id: string) => {
      const t = get(id);
      if (t) sheets.open(() => <ListSheet value={t.listId} onChange={(listId) => updateTask(id, { listId })} />);
    },
    [sheets, updateTask],
  );

  const pickPriority = useCallback(
    (id: string) => {
      const t = get(id);
      if (t) sheets.open(() => <PrioritySheet value={t.priority} onChange={(priority) => updateTask(id, { priority })} />);
    },
    [sheets, updateTask],
  );

  const pickTags = useCallback(
    (id: string) => {
      const t = get(id);
      if (t) sheets.open(() => <TagsSheet value={t.tagIds} onChange={(tagIds) => updateTask(id, { tagIds })} />);
    },
    [sheets, updateTask],
  );

  return { toggle, remove, openDetails, pickDate, pickList, pickPriority, pickTags };
}

export type TaskActions = ReturnType<typeof useTaskActions>;
export type { Task };
