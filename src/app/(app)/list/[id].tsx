import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { Check } from '@/components/Check';
import { ContentIn } from '@/components/ContentIn';
import { PressScale } from '@/components/PressScale';
import { useSheets } from '@/components/Sheet';
import { Card, Fab, GroupLabel, IconButton, Swatch } from '@/components/ui';
import { QuickActionsSheet } from '@/features/sheets/QuickActionsSheet';
import { QuickAddSheet } from '@/features/sheets/QuickAddSheet';
import { ListMenuSheet } from '@/features/sheets/ListMenuSheet';
import { useMenu } from '@/features/useMenu';
import { useTaskActions } from '@/features/useTaskActions';
import { listGroups, listRowSub, openCount, sortTasks, type Group } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

/** VProject: one list, grouped Overdue / Today / Next 7 days / Later / No date. */
export default function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const openMenu = useMenu();
  const actions = useTaskActions();
  const { today } = useToday();
  const list = useStore((s) => s.lists.find((l) => l.id === id));
  const tasks = useStore((s) => s.tasks);
  const tags = useStore((s) => s.tags);
  // Ticked here stays visible (tinted, "Done just now") until you leave, as in NDoneUndo.
  const [justDone, setJustDone] = useState<Set<string>>(new Set());

  if (!list || list.deletedAt) return <View style={{ flex: 1, backgroundColor: c.ground }} />;

  const base = listGroups(tasks, list.id, today, justDone).map((g) => (list.sortBy === 'date' ? g : { ...g, tasks: sortTasks(g.tasks, list.sortBy) }));
  // "Show done tasks" (NListMenu) adds the rest of the done tasks at the end.
  const doneRest = list.showDone ? tasks.filter((t) => t.listId === list.id && t.doneAt && !t.deletedAt && !justDone.has(t.id)) : [];
  const groups: (Omit<Group, 'key'> & { key: Group['key'] | 'done' })[] = doneRest.length
    ? [...base, { key: 'done', label: 'Done', tasks: [...doneRest].sort((a, b) => b.doneAt!.localeCompare(a.doneAt!)) }]
    : base;
  const open = openCount(tasks, list.id);
  const toggle = (taskId: string) => {
    const wasDone = !!tasks.find((t) => t.id === taskId)?.doneAt;
    if (!wasDone) setJustDone((s) => new Set(s).add(taskId));
    actions.toggle(taskId);
  };
  const quickActions = (taskId: string) => sheets.open(() => <QuickActionsSheet taskId={taskId} actions={actions} />);

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 140 + insets.bottom }}>
        <View style={styles.header}>
          <View style={styles.topRow}>
            <IconButton icon="menu" label="Open menu" iconSize={24} style={{ marginLeft: -10 }} onPress={openMenu} />
            <IconButton icon="more" label="List options" style={{ marginRight: -10 }} onPress={() => sheets.open(() => <ListMenuSheet listId={list.id} />)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <Swatch color={listColors[list.color]} />
            <AppText tone="secondary" style={{ fontSize: 15 }}>
              {`List · ${open} open task${open === 1 ? '' : 's'}`}
            </AppText>
          </View>
          <ContentIn>
            <AppText variant="display" accessibilityRole="header" style={{ marginTop: 4 }}>
              {list.name}
            </AppText>
          </ContentIn>
        </View>

        {groups.length === 0 ? (
          <ContentIn index={1} style={{ paddingTop: 26 }}>
            <EmptyState
              icon="listPlain"
              title={`Nothing in ${list.name} yet`}
              text="Add a task, or move one here from another list."
              actions={[{ label: `Add to ${list.name}`, primary: true, onPress: () => sheets.open(() => <QuickAddSheet listId={list.id} />) }]}
            />
          </ContentIn>
        ) : null}

        {groups.map((g, gi) => (
          <ContentIn key={g.key} index={gi + 1}>
            <GroupLabel tone={g.key === 'overdue' ? 'danger' : 'secondary'} style={gi === 0 ? { paddingTop: 26 } : undefined}>
              {`${g.label} · ${g.tasks.length}`}
            </GroupLabel>
            <Card>
              {g.tasks.map((t, i) => {
                const done = !!t.doneAt;
                const sub = done ? (justDone.has(t.id) ? 'Done just now' : listRowSub(t, tags, today)) : listRowSub(t, tags, today);
                return (
                  <View
                    key={t.id}
                    style={[
                      styles.row,
                      done && { backgroundColor: c.tint },
                      i < g.tasks.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.ground },
                    ]}
                  >
                    <PressScale
                      kind="row"
                      accessibilityRole="button"
                      accessibilityHint="Opens task details. Long press for quick actions."
                      onPress={() => actions.openDetails(t.id)}
                      onLongPress={() => quickActions(t.id)}
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <AppText style={[styles.title, done && { color: c.textSecondary, textDecorationLine: 'line-through' }]}>{t.title}</AppText>
                      {sub ? (
                        <AppText variant="secondary" style={{ marginTop: 4, color: g.key === 'overdue' && !done ? c.dangerText : c.textSecondary }}>
                          {sub}
                        </AppText>
                      ) : null}
                    </PressScale>
                    <Check done={done} priority={t.priority} label={t.title} onToggle={() => toggle(t.id)} />
                  </View>
                );
              })}
            </Card>
          </ContentIn>
        ))}
      </ScrollView>
      <Fab label={`Add task to ${list.name}`} onPress={() => sheets.open(() => <QuickAddSheet listId={list.id} />)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 18, paddingHorizontal: size.sideMargin },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 20, paddingRight: 12, minHeight: 64 },
  title: { ...font(700), fontSize: 16, lineHeight: 21 },
});
