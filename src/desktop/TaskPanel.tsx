import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Check } from '@/components/Check';
import { GrowingInput } from '@/components/GrowingInput';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useSheets } from '@/components/Sheet';
import { ReminderSheet } from '@/features/sheets/ReminderSheet';
import { RepeatSheet } from '@/features/sheets/RepeatSheet';
import { useTaskActions } from '@/features/useTaskActions';
import { monthDay, toKey } from '@/lib/dates';
import { shortRuleLabel } from '@/lib/repeat';
import { dateValue, PRIORITY_LABEL, reminderLabel } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { Kbd } from './Kbd';
import { useOpenTaskMenu } from './Menu';
import { DonePanel } from './views/CompletedDesk';
import { selectTask } from './state';

const webInput = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

/** WToday's detail panel: the selected task, edited in place (saves on its own). */
export function TaskPanel({ id, onClose }: { id: string; onClose: () => void }) {
  return <TaskPanelInner key={id} id={id} onClose={onClose} />;
}

function TaskPanelInner({ id, onClose }: { id: string; onClose: () => void }) {
  const { c } = useTheme();
  const sheets = useSheets();
  const actions = useTaskActions();
  const openMenu = useOpenTaskMenu();
  const { today } = useToday();
  const task = useStore((s) => s.tasks.find((t) => t.id === id && !t.deletedAt));
  const list = useStore((s) => s.lists.find((l) => l.id === task?.listId));
  const tags = useStore((s) => s.tags);
  const updateTask = useStore((s) => s.updateTask);
  const addSubtask = useStore((s) => s.addSubtask);
  const toggleSubtask = useStore((s) => s.toggleSubtask);
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [newSub, setNewSub] = useState('');
  const [adding, setAdding] = useState(false);

  if (!task) return <EmptyPanel />;
  if (task.doneAt) return <DonePanel task={task} onClose={onClose} />;

  const saveTitle = () => (title.trim() ? updateTask(task.id, { title: title.trim() }) : setTitle(task.title));
  const saveNotes = () => notes !== task.notes && updateTask(task.id, { notes });
  const date = dateValue(task, today);
  const priorityColor = [c.textSecondary, c.accentText, c.priorityMediumText, c.dangerText][task.priority];
  const tagText = task.tagIds.map((tid) => tags.find((t) => t.id === tid)?.name).filter(Boolean).map((n) => `#${n}`).join(' ');
  const doneSubs = task.subtasks.filter((s) => s.doneAt).length;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, gap: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {list ? <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: listColors[list.color] }} /> : null}
        <AppText tone="secondary" style={{ ...font(600), fontSize: 13, flex: 1 }}>
          {list?.name ?? 'No list'}
        </AppText>
        <PressScale
          accessibilityRole="button"
          accessibilityLabel="More options"
          onPress={(e) => openMenu(task.id, (e.nativeEvent as unknown as { pageX: number }).pageX, (e.nativeEvent as unknown as { pageY: number }).pageY + 12)}
          style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="more" size={20} color={c.text} />
        </PressScale>
        <PressScale accessibilityRole="button" accessibilityLabel="Close details" onPress={onClose} style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={20} color={c.text} />
        </PressScale>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <GrowingInput
          value={title}
          onChangeText={setTitle}
          onBlur={saveTitle}
          onSubmitEditing={saveTitle}
          accessibilityLabel="Title"
          style={[{ flex: 1, padding: 0, ...font(800), fontSize: 24, lineHeight: 30, color: task.doneAt ? c.textSecondary : c.text, textDecorationLine: task.doneAt ? 'line-through' : 'none' }, webInput]}
        />
        <View style={{ marginTop: -6, marginRight: -8 }}>
          <Check done={!!task.doneAt} priority={task.priority} label={task.title} onToggle={() => actions.toggle(task.id)} />
        </View>
      </View>
      <GrowingInput
        value={notes}
        onChangeText={setNotes}
        onBlur={saveNotes}
        placeholder="Add a description"
        placeholderTextColor={c.line}
        accessibilityLabel="Description"
        style={[{ padding: 0, fontSize: 14.5, lineHeight: 22, color: c.textSecondary }, webInput]}
      />

      <View style={{ backgroundColor: c.ground, borderRadius: 18 }}>
        <KV label="Date" k="D" valueColor={date ? c.accentText : c.textSecondary} value={date || 'No date'} onPress={() => actions.pickDate(task.id)} />
        <KV
          label="List"
          k="M"
          value={
            <>
              {list ? <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: listColors[list.color] }} /> : null}
              <AppText style={{ ...font(700), fontSize: 14.5 }}>{list?.name ?? 'None'}</AppText>
            </>
          }
          onPress={() => actions.pickList(task.id)}
        />
        <KV label="Priority" k="P" value={PRIORITY_LABEL[task.priority]} valueColor={priorityColor} onPress={() => actions.pickPriority(task.id)} />
        <KV label="Tags" k="T" value={tagText || 'None'} valueColor={tagText ? c.text : c.textSecondary} onPress={() => actions.pickTags(task.id)} />
        <KV
          label="Reminder"
          value={reminderLabel(task.reminderMinutes)}
          valueColor={task.reminderMinutes == null ? c.textSecondary : c.text}
          onPress={() =>
            task.dueDate
              ? sheets.open(() => <ReminderSheet title={task.title} date={task.dueDate} time={task.startTime} value={task.reminderMinutes} onChange={(r) => updateTask(task.id, { reminderMinutes: r })} />)
              : actions.pickDate(task.id)
          }
        />
        <KV
          label="Repeat"
          value={shortRuleLabel(task.repeatRule)}
          valueColor={task.repeatRule ? c.text : c.textSecondary}
          last
          onPress={() => sheets.open(() => <RepeatSheet value={task.repeatRule} start={task.dueDate ?? today} onChange={(r) => updateTask(task.id, { repeatRule: r, dueDate: r && !task.dueDate ? today : task.dueDate })} />)}
        />
      </View>

      <AppText style={{ ...font(700), fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', color: c.textSecondary }}>
        {task.subtasks.length ? `Subtasks · ${doneSubs} of ${task.subtasks.length}` : 'Subtasks'}
      </AppText>
      <View style={{ backgroundColor: c.ground, borderRadius: 18 }}>
        {task.subtasks.map((st) => (
          <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingLeft: 16, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: c.card }}>
            <AppText style={{ flex: 1, ...font(600), fontSize: 14.5, color: st.doneAt ? c.textSecondary : c.text, textDecorationLine: st.doneAt ? 'line-through' : 'none' }}>{st.title}</AppText>
            <Check circle={22} done={!!st.doneAt} label={st.title} onToggle={() => toggleSubtask(task.id, st.id)} />
          </View>
        ))}
        {adding ? (
          <View style={{ minHeight: 46, paddingHorizontal: 16, justifyContent: 'center' }}>
            <TextInput
              autoFocus
              value={newSub}
              onChangeText={setNewSub}
              onSubmitEditing={() => {
                if (newSub.trim()) addSubtask(task.id, newSub);
                setNewSub('');
              }}
              onBlur={() => setAdding(false)}
              submitBehavior="submit"
              placeholder="Subtask"
              placeholderTextColor={c.line}
              style={[{ fontSize: 14.5, color: c.text, ...font(600) }, webInput]}
            />
          </View>
        ) : (
          <PressScale kind="row" accessibilityRole="button" onPress={() => setAdding(true)} style={{ minHeight: 46, paddingHorizontal: 16, justifyContent: 'center' }}>
            <AppText style={{ ...font(700), fontSize: 14.5, color: c.accentText }}>+ Add subtask</AppText>
          </PressScale>
        )}
      </View>
      <View style={{ flex: 1 }} />
      <AppText tone="secondary" style={{ fontSize: 12.5 }}>{`Created ${monthDay(toKey(new Date(task.createdAt)))} · edits save automatically`}</AppText>
    </ScrollView>
  );
}

function KV({ label, value, valueColor, k, last, onPress }: { label: string; value: ReactNode; valueColor?: string; k?: string; last?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={typeof value === 'string' ? `${label}, ${value}` : label}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.card, backgroundColor: hover ? c.desk.hover : 'transparent', borderRadius: hover ? 12 : 0 }}
    >
      <AppText tone="secondary" style={{ ...font(600), fontSize: 14.5 }}>
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {typeof value === 'string' ? <AppText style={{ ...font(700), fontSize: 14.5, color: valueColor ?? c.text }}>{value}</AppText> : value}
        {k ? <Kbd k={k} /> : null}
      </View>
    </Pressable>
  );
}

/** "Pick a task to see it here" (WTodayCheckin's empty panel). */
export function EmptyPanel() {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 }}>
      <View aria-hidden style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon name="note" size={26} color={c.textSecondary} />
      </View>
      <AppText style={{ ...font(800), fontSize: 18 }}>Pick a task to see it here</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4, maxWidth: 280 }}>
        <AppText tone="secondary" style={{ fontSize: 14.5 }}>
          Click a task, or use
        </AppText>
        <Kbd k="↑" />
        <Kbd k="↓" />
        <AppText tone="secondary" style={{ fontSize: 14.5 }}>
          to move and
        </AppText>
        <Kbd k="Enter" />
        <AppText tone="secondary" style={{ fontSize: 14.5 }}>
          to open.
        </AppText>
      </View>
    </View>
  );
}

export const clearSelection = () => selectTask(null);
