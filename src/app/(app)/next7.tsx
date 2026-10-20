import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressScale } from '@/components/PressScale';
import { MainScroll, ScreenHeader, ShowMoreRow, TaskRow } from '@/components/rows';
import { useSheets } from '@/components/Sheet';
import { Card, Fab, IconButton } from '@/components/ui';
import { goMain } from '@/features/nav';
import { QuickActionsSheet } from '@/features/sheets/QuickActionsSheet';
import { QuickAddSheet } from '@/features/sheets/QuickAddSheet';
import { useMenu } from '@/features/useMenu';
import { useTaskActions } from '@/features/useTaskActions';
import { addDays, fromKey, monthDay, weekdayLong, weekdayShort } from '@/lib/dates';
import { next7View, timelineSub, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { useDesk } from '@/desktop/layout';
import { Next7Desk } from '@/desktop/views/ViewsDesk';

const SHOWN = 2;

/** NNext7 */
export default function Route() {
  const { desk } = useDesk();
  return desk ? <Next7Desk /> : <Next7Phone />;
}

function Next7Phone() {
  const { c } = useTheme();
  const sheets = useSheets();
  const openMenu = useMenu();
  const actions = useTaskActions();
  const { today } = useToday();
  const tasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const days = next7View(visibleTasks(tasks, lists), today);
  const total = days.reduce((n, d) => n + d.tasks.filter((t) => !t.doneAt).length, 0);
  const last = addDays(today, 6);

  return (
    <MainScroll fab={<Fab label="Add task" onPress={() => sheets.open(() => <QuickAddSheet />)} />}>
      <ScreenHeader
        onMenu={openMenu}
        right={<IconButton icon="search" label="Search" style={{ marginRight: -10 }} onPress={() => goMain('/search')} />}
        subtitle={`${monthDay(today)} – ${monthDay(last)} · ${total} task${total === 1 ? '' : 's'}`}
        title="Next 7 Days"
      />
      {days.map((d, i) => {
        const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekdayLong(d.key);
        const right = i < 2 ? `${weekdayShort(d.key)} ${fromKey(d.key).getDate()}` : monthDay(d.key);
        const open = expanded.has(d.key);
        const shown = open ? d.tasks : d.tasks.slice(0, SHOWN);
        return (
          <View key={d.key}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 10, paddingHorizontal: size.sideMargin }}>
              <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 15 }}>
                {label}
              </AppText>
              <AppText tone="secondary" style={{ ...font(700), fontSize: 14 }}>
                {right}
              </AppText>
            </View>
            {d.tasks.length ? (
              <Card>
                {shown.map((t, j) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    sub={t.startTime ? timelineSub(t, lists) : ['Anytime', lists.find((l) => l.id === t.listId)?.name].filter(Boolean).join(' · ')}
                    last={j === shown.length - 1 && (open || d.tasks.length <= SHOWN)}
                    onOpen={() => actions.openDetails(t.id)}
                    onLongPress={() => sheets.open(() => <QuickActionsSheet taskId={t.id} actions={actions} />)}
                    onToggle={() => actions.toggle(t.id)}
                  />
                ))}
                {!open && d.tasks.length > SHOWN ? (
                  <ShowMoreRow count={d.tasks.length - SHOWN} onPress={() => (i === 0 ? goMain('/') : setExpanded((s) => new Set(s).add(d.key)))} />
                ) : null}
              </Card>
            ) : (
              <View style={{ marginHorizontal: size.sideMargin, borderRadius: 18, paddingLeft: 20, paddingRight: 8, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.fill }}>
                <AppText tone="secondary" style={{ fontSize: 14 }}>
                  Nothing planned
                </AppText>
                <PressScale
                  accessibilityRole="button"
                  accessibilityLabel={`Add a task for ${label}`}
                  onPress={() => sheets.open(() => <QuickAddSheet date={d.key} />)}
                  style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: radius.chip, justifyContent: 'center' }}
                >
                  <AppText tone="accent" style={{ ...font(700), fontSize: 14 }}>
                    + Add
                  </AppText>
                </PressScale>
              </View>
            )}
          </View>
        );
      })}
    </MainScroll>
  );
}
