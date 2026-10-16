import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { monthDay, toKey } from '@/lib/dates';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { font } from '@/theme/typography';
import type { TaskActions } from '../useTaskActions';

/** NTaskMore: ⋯ on task details. */
export function TaskMoreSheet({ taskId, actions }: { taskId: string; actions: TaskActions }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const snack = useSnackbar();
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId));
  const listName = useStore((s) => s.lists.find((l) => l.id === task?.listId)?.name ?? 'Inbox');
  const taskToNote = useStore((s) => s.taskToNote);
  const taskBackToInbox = useStore((s) => s.taskBackToInbox);
  const duplicateTask = useStore((s) => s.duplicateTask);
  if (!task) return null;

  const leave = () => {
    close();
    if (router.canGoBack()) router.back();
  };

  return (
    <SheetCard label="Task options" gap={14} style={{ paddingBottom: 28 }}>
      <View>
        <AppText style={{ ...font(800), fontSize: 18 }}>{task.title}</AppText>
        <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 4 }}>
          Created {monthDay(toKey(new Date(task.createdAt)))} · {listName}
        </AppText>
      </View>
      <View style={{ backgroundColor: c.ground, borderRadius: radius.card, overflow: 'hidden' }}>
        <Row
          icon="note"
          label="Turn into a note"
          hint="Moves it to Notes, keeps the text"
          onPress={() => {
            const undo = taskToNote(taskId);
            leave();
            snack({ title: 'Moved to Notes', sub: task.title, actions: [{ label: 'Undo', onPress: undo }] });
          }}
        />
        <Row
          icon="inbox"
          label="Back to Inbox"
          hint="Clears the date to decide later"
          onPress={() => {
            const undo = taskBackToInbox(taskId);
            leave();
            snack({ title: 'Back in Inbox', sub: task.title, actions: [{ label: 'Undo', onPress: undo }] });
          }}
        />
        <Row
          icon="copy"
          label="Duplicate"
          onPress={() => {
            const id = duplicateTask(taskId);
            close();
            if (id) router.replace({ pathname: '/task/[id]', params: { id } });
          }}
        />
        <Row
          icon="trash"
          label="Delete"
          danger
          last
          onPress={() => {
            leave();
            actions.remove(taskId);
          }}
        />
      </View>
    </SheetCard>
  );
}

function Row({ icon, label, hint, danger, last, onPress }: { icon: IconName; label: string; hint?: string; danger?: boolean; last?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale
      kind="row"
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 18, paddingVertical: hint ? 10 : 0, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.card }}
    >
      <Icon name={icon} color={danger ? c.dangerText : c.textSecondary} />
      <View>
        <AppText style={{ ...font(600), fontSize: 16, color: danger ? c.dangerText : c.text }}>{label}</AppText>
        {hint ? (
          <AppText tone="secondary" style={{ fontSize: 13, marginTop: 2 }}>
            {hint}
          </AppText>
        ) : null}
      </View>
    </PressScale>
  );
}
