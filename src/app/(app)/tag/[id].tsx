import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { ListTag, MainScroll, ScreenHeader, TaskRow } from '@/components/rows';
import { useSheets } from '@/components/Sheet';
import { Card, EmptyCard, Fab, GroupLabel } from '@/components/ui';
import { QuickActionsSheet } from '@/features/sheets/QuickActionsSheet';
import { QuickAddSheet } from '@/features/sheets/QuickAddSheet';
import { useMenu } from '@/features/useMenu';
import { useTaskActions } from '@/features/useTaskActions';
import { dueShort, isOpen, tagGroups, timeRangeOf, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';

/** NTagView */
export default function TagView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sheets = useSheets();
  const openMenu = useMenu();
  const actions = useTaskActions();
  const { today } = useToday();
  const tag = useStore((s) => s.tags.find((t) => t.id === id));
  const allTasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const [justDone, setJustDone] = useState<Set<string>>(new Set());
  if (!tag) return <MainScroll>{null}</MainScroll>;

  const tasks = visibleTasks(allTasks, lists);
  const groups = tagGroups(tasks, tag.id, today, justDone);
  const open = tasks.filter((t) => isOpen(t) && t.tagIds.includes(tag.id));
  const listCount = new Set(open.map((t) => t.listId ?? 'none')).size;

  return (
    <MainScroll fab={<Fab label={`Add task with #${tag.name}`} onPress={() => sheets.open(() => <QuickAddSheet initialText={`#${tag.name} `} />)} />}>
      <ScreenHeader
        onMenu={openMenu}
        subtitle={`Tag · ${open.length} open task${open.length === 1 ? '' : 's'}${listCount > 1 ? ` across ${listCount} lists` : ''}`}
        title={
          <>
            <AppText variant="display" tone="secondary">
              #
            </AppText>
            {tag.name}
          </>
        }
      />
      {groups.length === 0 ? (
        <View style={{ paddingTop: 26 }}>
          <EmptyCard>No open tasks with this tag.</EmptyCard>
        </View>
      ) : null}
      {groups.map((g, gi) => (
        <View key={g.key}>
          <GroupLabel tone={g.key === 'overdue' ? 'danger' : 'secondary'} style={gi === 0 ? { paddingTop: 26 } : undefined}>
            {`${g.label} · ${g.tasks.length}`}
          </GroupLabel>
          <Card>
            {g.tasks.map((t, j) => {
              const list = lists.find((l) => l.id === t.listId);
              const when = g.key === 'noDate' ? '' : g.key === 'today' ? timeRangeOf(t) : dueShort(t, today);
              return (
                <TaskRow
                  key={t.id}
                  task={t}
                  sub={
                    when || list ? (
                      <>
                        {when ? (
                          <AppText tone={g.key === 'overdue' ? 'danger' : 'secondary'} style={{ fontSize: 13.5 }}>
                            {when}
                            {list ? ' · ' : ''}
                          </AppText>
                        ) : null}
                        {list ? <ListTag name={list.name} color={list.color} /> : null}
                      </>
                    ) : undefined
                  }
                  last={j === g.tasks.length - 1}
                  onOpen={() => actions.openDetails(t.id)}
                  onLongPress={() => sheets.open(() => <QuickActionsSheet taskId={t.id} actions={actions} />)}
                  onToggle={() => {
                    if (!t.doneAt) setJustDone((s) => new Set(s).add(t.id));
                    actions.toggle(t.id);
                  }}
                />
              );
            })}
          </Card>
        </View>
      ))}
    </MainScroll>
  );
}
