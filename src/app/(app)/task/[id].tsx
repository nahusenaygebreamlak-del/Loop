import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Check } from '@/components/Check';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useSheets } from '@/components/Sheet';
import { Card, IconButton, Swatch } from '@/components/ui';
import { DateSheet } from '@/features/sheets/DateSheet';
import { ReminderSheet } from '@/features/sheets/ReminderSheet';
import { TaskMoreSheet } from '@/features/sheets/TaskMoreSheet';
import { useTaskActions } from '@/features/useTaskActions';
import { dateValue, PRIORITY_LABEL, reminderLabel } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

const webInput = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

/** VTaskDetail */
export default function TaskDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Keyed so switching tasks (e.g. Duplicate) starts with fresh edit state.
  return <TaskDetail key={id} id={id} />;
}

function TaskDetail({ id }: { id: string }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const actions = useTaskActions();
  const { today } = useToday();
  const task = useStore((s) => s.tasks.find((t) => t.id === id && !t.deletedAt));
  const list = useStore((s) => s.lists.find((l) => l.id === task?.listId));
  const tags = useStore((s) => s.tags);
  const updateTask = useStore((s) => s.updateTask);
  const addSubtask = useStore((s) => s.addSubtask);
  const toggleSubtask = useStore((s) => s.toggleSubtask);

  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [adding, setAdding] = useState(false);
  const [newSub, setNewSub] = useState('');


  if (!task) return <View style={{ flex: 1, backgroundColor: c.ground }} />;

  const saveTitle = () => (title.trim() ? updateTask(task.id, { title: title.trim() }) : setTitle(task.title));
  const saveNotes = () => notes !== task.notes && updateTask(task.id, { notes });
  const date = dateValue(task, today);
  const priorityColor = [c.textSecondary, c.priority.low, c.priority.medium, c.dangerText][task.priority];
  const tagText = task.tagIds.map((tid) => tags.find((t) => t.id === tid)?.name).filter(Boolean).map((n) => `#${n}`).join(' ');
  const doneSubs = task.subtasks.filter((s) => s.doneAt).length;

  const submitSub = () => {
    if (newSub.trim()) addSubtask(task.id, newSub);
    setNewSub('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 + insets.bottom }}>
        <View style={styles.header}>
          <IconButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <View style={{ flex: 1 }} />
          <IconButton icon="more" label="More options" onPress={() => sheets.open(() => <TaskMoreSheet taskId={task.id} actions={actions} />)} />
        </View>

        <View style={styles.titleRow}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            onBlur={saveTitle}
            onSubmitEditing={saveTitle}
            multiline
            submitBehavior="blurAndSubmit"
            accessibilityLabel="Title"
            style={[styles.title, { color: task.doneAt ? c.textSecondary : c.text }, task.doneAt && { textDecorationLine: 'line-through' }, webInput]}
          />
          <View style={{ marginTop: -4, marginRight: -8 }}>
            <Check done={!!task.doneAt} priority={task.priority} label={task.title} onToggle={() => actions.toggle(task.id)} />
          </View>
        </View>

        <TextInput
          value={notes}
          onChangeText={setNotes}
          onBlur={saveNotes}
          multiline
          placeholder="Add a description"
          placeholderTextColor={c.textSecondary}
          accessibilityLabel="Description"
          style={[styles.notes, { color: c.textSecondary }, webInput]}
        />

        <Card style={{ marginTop: 22 }}>
          <PropRow label="Date" value={date ?? 'No date'} valueColor={date ? c.accentText : c.textSecondary} onPress={() => actions.pickDate(task.id)} />
          <PropRow
            label="List"
            value={list?.name ?? 'Inbox'}
            lead={list ? <Swatch color={listColors[list.color]} size={10} /> : null}
            onPress={() => actions.pickList(task.id)}
          />
          <PropRow label="Priority" value={PRIORITY_LABEL[task.priority]} valueColor={priorityColor} onPress={() => actions.pickPriority(task.id)} />
          <PropRow label="Tags" value={tagText || 'None'} valueColor={tagText ? c.text : c.textSecondary} onPress={() => actions.pickTags(task.id)} />
          <PropRow
            last
            label="Reminder"
            value={reminderLabel(task.reminderMinutes)}
            valueColor={task.reminderMinutes == null ? c.textSecondary : c.text}
            onPress={() =>
              task.dueDate
                ? sheets.open(() => <ReminderSheet value={task.reminderMinutes} onChange={(r) => updateTask(task.id, { reminderMinutes: r })} />)
                : sheets.open(() => (
                    <DateSheet
                      value={{ dueDate: task.dueDate, startTime: task.startTime, endTime: task.endTime, reminderMinutes: task.reminderMinutes, repeatRule: task.repeatRule }}
                      onChange={(v) => updateTask(task.id, v)}
                    />
                  ))
            }
          />
        </Card>

        <View style={{ paddingTop: 24, paddingBottom: 10, paddingHorizontal: size.sideMargin }}>
          <AppText variant="label" tone="secondary" accessibilityRole="header">
            {task.subtasks.length ? `Subtasks · ${doneSubs} of ${task.subtasks.length}` : 'Subtasks'}
          </AppText>
        </View>
        <Card>
          {task.subtasks.map((s) => (
            <View key={s.id} style={[styles.sub, { borderBottomColor: c.ground }]}>
              <AppText style={[styles.subText, s.doneAt ? { color: c.textSecondary, textDecorationLine: 'line-through' } : null]}>{s.title}</AppText>
              <Check done={!!s.doneAt} label={s.title} onToggle={() => toggleSubtask(task.id, s.id)} />
            </View>
          ))}
          {adding ? (
            <View style={[styles.sub, { borderBottomWidth: 0 }]}>
              <TextInput
                autoFocus
                value={newSub}
                onChangeText={setNewSub}
                onSubmitEditing={submitSub}
                onBlur={() => {
                  submitSub();
                  setAdding(false);
                }}
                submitBehavior="submit"
                placeholder="Subtask"
                placeholderTextColor={c.textSecondary}
                accessibilityLabel="New subtask"
                style={[styles.subText, { color: c.text, paddingVertical: 0 }, webInput]}
              />
            </View>
          ) : (
            <PressScale kind="row" accessibilityRole="button" onPress={() => setAdding(true)} style={[styles.sub, { borderBottomWidth: 0, gap: 8 }]}>
              <Icon name="plus" size={20} color={c.accentText} />
              <AppText style={[styles.subText, { color: c.accentText }]}>Add subtask</AppText>
            </PressScale>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

function PropRow({ label, value, valueColor, lead, last, onPress }: { label: string; value: string; valueColor?: string; lead?: ReactNode; last?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale
      kind="row"
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={[styles.prop, { borderBottomColor: c.ground, borderBottomWidth: last ? 0 : 1 }]}
    >
      <AppText tone="secondary" style={[styles.propText, { flex: 1 }]}>
        {label}
      </AppText>
      {lead}
      <AppText numberOfLines={1} style={[styles.propText, { color: valueColor ?? c.text, flexShrink: 1 }]}>
        {value}
      </AppText>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 4 },
  titleRow: { paddingTop: 8, paddingHorizontal: size.sideMargin, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, ...font(800), fontSize: 26, lineHeight: 33, letterSpacing: -0.26, padding: 0, textAlignVertical: 'top' },
  notes: { marginTop: 12, marginHorizontal: size.sideMargin, fontSize: 15.5, lineHeight: 24, padding: 0, ...font(500), textAlignVertical: 'top' },
  prop: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, paddingLeft: 18, paddingRight: 16 },
  propText: { ...font(600), fontSize: 15 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, paddingLeft: 18, paddingRight: 8, borderBottomWidth: 1 },
  subText: { flex: 1, ...font(600), fontSize: 15.5 },
});
