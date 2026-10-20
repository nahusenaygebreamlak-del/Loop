import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { useCloseSheet, useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { useTaskActions } from '@/features/useTaskActions';
import { addDays, nextMonday, todayKey } from '@/lib/dates';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { Kbd } from './Kbd';
import { selectTask } from './state';

/** A floating menu card (.menu): 270 px, 1 px border, opens at the pointer or a button. */
export function MenuCard({ children, width = 270, label }: { children: ReactNode; width?: number; label: string }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="menu" accessibilityLabel={label} style={{ width, backgroundColor: c.card, borderWidth: 1, borderColor: c.desk.border, borderRadius: 16, padding: 6 }}>
      {children}
    </View>
  );
}

/** One menu row (.mi): grey highlight under the pointer, red for delete, key on the right. */
export function MenuItem({ label, icon, keys, value, danger, onPress }: { label: string; icon?: IconName; keys?: string[]; value?: string; danger?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const [hover, setHover] = useState(false);
  const fg = danger ? c.dangerText : c.text;
  return (
    <Pressable
      accessibilityRole="menuitem"
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40, paddingHorizontal: 12, borderRadius: 10, backgroundColor: hover ? c.desk.hover : 'transparent' }}
    >
      {icon ? <Icon name={icon} size={18} color={danger ? c.dangerText : c.textSecondary} /> : null}
      <AppText style={{ flex: 1, ...font(600), fontSize: 14.5, color: fg }}>{label}</AppText>
      {value ? <AppText style={{ ...font(600), fontSize: 13, color: c.textSecondary }}>{value}</AppText> : null}
      {keys ? (
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {keys.map((k) => (
            <Kbd key={k} k={k} />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

export function MenuSeparator() {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.ground, marginVertical: 6, marginHorizontal: 4 }} />;
}

/** WContext: right-click (or ⋯) quick actions for a task. */
export function TaskMenu({ taskId }: { taskId: string }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const snack = useSnackbar();
  const actions = useTaskActions();
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId));
  const updateTask = useStore((s) => s.updateTask);
  if (!task) return null;
  const today = todayKey();
  const setDate = (d: string) => {
    const before = task.dueDate;
    updateTask(taskId, { dueDate: d });
    close();
    snack({ title: d === today ? 'Moved to today' : d === addDays(today, 1) ? 'Moved to tomorrow' : 'Moved to next week', actions: [{ label: 'Undo', onPress: () => updateTask(taskId, { dueDate: before }) }] });
  };
  const then = (fn: () => void) => () => {
    close();
    setTimeout(fn, 0);
  };
  const quick: [IconName, string, () => void, boolean][] = [
    ['sun', 'Today', () => setDate(today), task.dueDate === today],
    ['arrowRight', 'Tomorrow', () => setDate(addDays(today, 1)), task.dueDate === addDays(today, 1)],
    ['nextWeek', 'Next wk', () => setDate(nextMonday(today)), task.dueDate === nextMonday(today)],
    ['calendar', 'Pick', then(() => actions.pickDate(taskId)), false],
  ];
  return (
    <View accessibilityRole="menu" accessibilityLabel="Quick actions" style={{ width: 280, backgroundColor: c.card, borderWidth: 1, borderColor: c.desk.border, borderRadius: 18, padding: 8 }}>
      <View style={{ flexDirection: 'row', gap: 4, paddingTop: 4, paddingHorizontal: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.ground }}>
        {quick.map(([icon, label, fn, on]) => (
          <QuickButton key={label} icon={icon} label={label} on={on} onPress={fn} />
        ))}
      </View>
      <View style={{ paddingTop: 6 }}>
        <MenuItem label="Move to list" keys={['M']} onPress={then(() => actions.pickList(taskId))} />
        <MenuItem label="Priority" keys={['P']} onPress={then(() => actions.pickPriority(taskId))} />
        <MenuItem label="Tags" keys={['T']} onPress={then(() => actions.pickTags(taskId))} />
        <MenuItem
          label="Duplicate"
          keys={['Ctrl', 'D']}
          onPress={() => {
            const id = useStore.getState().duplicateTask(taskId);
            close();
            if (id) selectTask(id);
          }}
        />
        <MenuItem
          label="Back to Inbox"
          onPress={() => {
            const undo = useStore.getState().taskBackToInbox(taskId);
            close();
            selectTask(null);
            snack({ title: 'Back in Inbox', actions: [{ label: 'Undo', onPress: undo }] });
          }}
        />
        <MenuItem
          label="Delete"
          danger
          keys={['Del']}
          onPress={() => {
            close();
            selectTask(null);
            actions.remove(taskId);
          }}
        />
      </View>
    </View>
  );
}

function QuickButton({ icon, label, on, onPress }: { icon: IconName; label: string; on: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const [hover, setHover] = useState(false);
  const fg = on ? c.accentText : c.text;
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={{ flex: 1, minHeight: 58, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: on ? c.tint : hover ? c.desk.hover : 'transparent' }}
    >
      <Icon name={icon} size={18} color={fg} />
      <AppText style={{ ...font(700), fontSize: 11.5, color: fg }}>{label}</AppText>
    </Pressable>
  );
}

/** Opens the task menu at the pointer. */
export function useOpenTaskMenu() {
  const sheets = useSheets();
  return (taskId: string, x: number, y: number) => {
    selectTask(taskId);
    sheets.open(() => <TaskMenu taskId={taskId} />, 'menu', { x, y });
  };
}
