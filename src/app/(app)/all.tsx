import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { FilterChips, MainScroll, ScreenHeader, ShowMoreRow, TaskRow } from '@/components/rows';
import { useSheets } from '@/components/Sheet';
import { Card, EmptyCard, Fab, IconButton, Swatch } from '@/components/ui';
import { goMain } from '@/features/nav';
import { QuickActionsSheet } from '@/features/sheets/QuickActionsSheet';
import { QuickAddSheet } from '@/features/sheets/QuickAddSheet';
import { useMenu } from '@/features/useMenu';
import { useTaskActions } from '@/features/useTaskActions';
import { allTasksGroups, dueShort, isOpen, visibleTasks, type AllMode } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import type { ListColor } from '@/store/types';
import { listColors, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

const SHOWN = 2;

/** NAllTasks */
export default function AllTasks() {
  const sheets = useSheets();
  const openMenu = useMenu();
  const actions = useTaskActions();
  const { today } = useToday();
  const allTasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const [mode, setMode] = useState<AllMode>('list');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tasks = visibleTasks(allTasks, lists);
  const groups = allTasksGroups(tasks, lists, mode, today);
  const open = tasks.filter(isOpen).length;

  return (
    <MainScroll fab={<Fab label="Add task" onPress={() => sheets.open(() => <QuickAddSheet />)} />}>
      <ScreenHeader
        onMenu={openMenu}
        right={<IconButton icon="search" label="Search" style={{ marginRight: -10 }} onPress={() => goMain('/search')} />}
        subtitle={`${open} open task${open === 1 ? '' : 's'}`}
        title="All tasks"
      />
      <FilterChips
        label="Group by"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setExpanded(new Set());
        }}
        options={[
          { value: 'list', label: 'By list' },
          { value: 'date', label: 'By date' },
          { value: 'priority', label: 'By priority' },
        ]}
      />
      {groups.length === 0 ? (
        <View style={{ paddingTop: 22 }}>
          <EmptyCard>No open tasks. Tap + to add one.</EmptyCard>
        </View>
      ) : null}
      {groups.map((g) => {
        const isOpenGroup = expanded.has(g.key);
        const shown = isOpenGroup ? g.tasks : g.tasks.slice(0, SHOWN);
        const more = !isOpenGroup && g.tasks.length > SHOWN;
        return (
          <View key={g.key}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 20, paddingBottom: 10, paddingHorizontal: size.sideMargin }}>
              {g.color ? <Swatch color={listColors[g.color as ListColor]} size={12} /> : null}
              <AppText accessibilityRole="header" tone={g.key === 'overdue' ? 'danger' : 'text'} style={{ ...font(800), fontSize: 15 }}>
                {g.label}
              </AppText>
              <AppText tone="secondary" style={{ ...font(700), fontSize: 14 }}>
                {g.tasks.length}
              </AppText>
            </View>
            <Card>
              {shown.map((t, j) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  sub={mode === 'list' ? dueShort(t, today) : [dueShort(t, today), lists.find((l) => l.id === t.listId)?.name].filter(Boolean).join(' · ')}
                  subDanger={!!t.dueDate && t.dueDate < today}
                  last={j === shown.length - 1 && !more}
                  onOpen={() => actions.openDetails(t.id)}
                  onLongPress={() => sheets.open(() => <QuickActionsSheet taskId={t.id} actions={actions} />)}
                  onToggle={() => actions.toggle(t.id)}
                />
              ))}
              {more ? (
                <ShowMoreRow
                  count={g.tasks.length - SHOWN}
                  onPress={() =>
                    mode === 'list' && g.listId ? goMain({ pathname: '/list/[id]', params: { id: g.listId } }) : setExpanded((s) => new Set(s).add(g.key))
                  }
                />
              ) : null}
            </Card>
          </View>
        );
      })}
    </MainScroll>
  );
}
