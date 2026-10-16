import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Check } from '@/components/Check';
import { ContentIn } from '@/components/ContentIn';
import { PressScale } from '@/components/PressScale';
import { useSheets } from '@/components/Sheet';
import { Card, EmptyCard, Fab, GroupLabel, IconButton } from '@/components/ui';
import { QuickActionsSheet } from '@/features/sheets/QuickActionsSheet';
import { QuickAddSheet } from '@/features/sheets/QuickAddSheet';
import { Timeline } from '@/features/today/Timeline';
import { WeekStrip } from '@/features/today/WeekStrip';
import { goMain } from '@/features/nav';
import { useMenu } from '@/features/useMenu';
import { useTaskActions } from '@/features/useTaskActions';
import { longDate, weekOf } from '@/lib/dates';
import { daysWithItems, todayView, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';
import { font } from '@/theme/typography';

/** VToday */
export default function Today() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const openMenu = useMenu();
  const weekStart = useSettings((st) => st.weekStart);
  const actions = useTaskActions();
  const { today, now } = useToday();
  const allTasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const tasks = visibleTasks(allTasks, lists);

  const { schedule, anytime, currentId } = todayView(tasks, today, now);
  const week = weekOf(today, weekStart);
  const dots = daysWithItems(tasks, week);
  const quickActions = (id: string) => sheets.open(() => <QuickActionsSheet taskId={id} actions={actions} />);

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 140 + insets.bottom }}>
        <View style={styles.header}>
          <View style={styles.topRow}>
            <IconButton icon="menu" label="Open menu" iconSize={24} style={{ marginLeft: -10 }} onPress={openMenu} />
            <IconButton icon="search" label="Search" style={{ marginRight: -10 }} onPress={() => goMain('/search')} />
          </View>
          <AppText tone="secondary" style={{ fontSize: 15, marginTop: 16 }}>
            {longDate(today)}
          </AppText>
          <ContentIn>
            <AppText variant="display" accessibilityRole="header" style={{ marginTop: 4 }}>
              Today
            </AppText>
          </ContentIn>
        </View>

        <WeekStrip days={week} today={today} withItems={dots} />

        {schedule.length === 0 && anytime.length === 0 ? (
          <ContentIn index={1} style={{ paddingTop: 28 }}>
            <EmptyCard>Nothing planned for today. Tap + to add a task.</EmptyCard>
          </ContentIn>
        ) : null}

        {schedule.length ? (
          <ContentIn index={1}>
            <GroupLabel style={{ paddingTop: 28, paddingBottom: 12 }}>Schedule</GroupLabel>
            <Timeline tasks={schedule} currentId={currentId} lists={lists} onOpen={actions.openDetails} onLongPress={quickActions} onToggle={actions.toggle} />
          </ContentIn>
        ) : null}

        {anytime.length ? (
          <ContentIn index={2}>
            <GroupLabel style={{ paddingTop: schedule.length ? 16 : 28, paddingBottom: 12 }}>{`Anytime today · ${anytime.length}`}</GroupLabel>
            <Card style={{ paddingVertical: 4, paddingLeft: 20, paddingRight: 12 }}>
              {anytime.map((t, i) => {
                const done = !!t.doneAt;
                return (
                  <View key={t.id} style={[styles.anyRow, i < anytime.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.ground }]}>
                    <PressScale
                      kind="row"
                      accessibilityRole="button"
                      accessibilityHint="Opens task details. Long press for quick actions."
                      onPress={() => actions.openDetails(t.id)}
                      onLongPress={() => quickActions(t.id)}
                      style={{ flex: 1, minHeight: 60, justifyContent: 'center' }}
                    >
                      <AppText style={[styles.anyTitle, done && { color: c.textSecondary, textDecorationLine: 'line-through' }]}>{t.title}</AppText>
                    </PressScale>
                    <Check done={done} priority={t.priority} label={t.title} onToggle={() => actions.toggle(t.id)} />
                  </View>
                );
              })}
            </Card>
          </ContentIn>
        ) : null}
      </ScrollView>
      <Fab label="Add task" onPress={() => sheets.open(() => <QuickAddSheet />)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 18, paddingHorizontal: size.sideMargin },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  anyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  anyTitle: { ...font(600), fontSize: 16 },
});
