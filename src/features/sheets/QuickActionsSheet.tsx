import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { addDays, nextMonday, todayKey } from '@/lib/dates';
import { PRIORITY_LABEL, taskSummaryLine } from '@/lib/taskViews';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';
import type { TaskActions } from '../useTaskActions';

/** NQuickActions: long press on a task. */
export function QuickActionsSheet({ taskId, actions }: { taskId: string; actions: TaskActions }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId));
  const lists = useStore((s) => s.lists);
  const tags = useStore((s) => s.tags);
  const updateTask = useStore((s) => s.updateTask);
  const duplicateTask = useStore((s) => s.duplicateTask);
  if (!task) return null;

  const today = todayKey();
  const setDate = (dueDate: string) => {
    updateTask(taskId, { dueDate });
    close();
  };
  // Pickers open after this sheet starts closing so they stack cleanly.
  const then = (fn: (id: string) => void) => () => {
    close();
    setTimeout(() => fn(taskId), 0);
  };

  const listName = lists.find((l) => l.id === task.listId)?.name ?? 'Inbox';
  const tagNames = task.tagIds.map((id) => tags.find((t) => t.id === id)?.name).filter(Boolean).join(', ');

  const header = (
    <View style={{ paddingHorizontal: size.sideMargin, paddingBottom: 16 }} pointerEvents="none">
      <View style={{ backgroundColor: c.card, borderRadius: radius.card, paddingVertical: 16, paddingHorizontal: 20 }}>
        <AppText variant="cardTitle">{task.title}</AppText>
        <AppText tone="secondary" variant="secondary" style={{ marginTop: 4 }}>
          {taskSummaryLine(task, lists, tags, today) || 'No date'}
        </AppText>
      </View>
    </View>
  );

  return (
    <SheetCard label="Quick actions" gap={14} header={header} style={{ paddingBottom: 28 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Quick icon="sun" label="Today" onPress={() => setDate(today)} />
        <Quick icon="arrowRight" label="Tomorrow" onPress={() => setDate(addDays(today, 1))} />
        <Quick icon="nextWeek" label="Next week" onPress={() => setDate(nextMonday(today))} />
        <Quick icon="calendar" label="Pick date" onPress={then(actions.pickDate)} />
      </View>
      <View>
        <Row icon="list" label="Move to list" value={listName} onPress={then(actions.pickList)} />
        <Row icon="flag" label="Priority" value={PRIORITY_LABEL[task.priority]} onPress={then(actions.pickPriority)} />
        <Row hash label="Tags" value={tagNames || 'None'} onPress={then(actions.pickTags)} />
        <Row
          icon="copy"
          label="Duplicate"
          onPress={() => {
            duplicateTask(taskId);
            close();
          }}
        />
        <Row icon="trash" label="Delete" danger onPress={then(actions.remove)} />
      </View>
    </SheetCard>
  );
}

function Quick({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      onPress={onPress}
      style={{ flex: 1, minHeight: 76, borderRadius: 18, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center', gap: 6 }}
    >
      <Icon name={icon} color={c.accentText} />
      <AppText style={{ ...font(700), fontSize: 13 }}>{label}</AppText>
    </PressScale>
  );
}

function Row({ icon, hash, label, value, danger, onPress }: { icon?: IconName; hash?: boolean; label: string; value?: string; danger?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const color = danger ? c.dangerText : c.text;
  return (
    <PressScale
      kind="row"
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 6 }}
    >
      {hash ? (
        <AppText tone="secondary" style={{ width: 22, textAlign: 'center', ...font(700), fontSize: 18 }}>
          #
        </AppText>
      ) : (
        <Icon name={icon!} color={danger ? c.dangerText : c.textSecondary} />
      )}
      <AppText style={{ ...font(600), fontSize: 16, color }}>{label}</AppText>
      {value ? (
        <AppText tone="secondary" numberOfLines={1} style={{ marginLeft: 'auto', ...font(600), fontSize: 14, flexShrink: 1 }}>
          {value}
        </AppText>
      ) : null}
    </PressScale>
  );
}
