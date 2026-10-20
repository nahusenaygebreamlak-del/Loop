import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Pop } from '@/components/Motion';
import { Check } from '@/components/Check';
import { ContentIn } from '@/components/ContentIn';
import { Chip, EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { ShowMoreRow, TaskRow } from '@/components/rows';
import { useSheets } from '@/components/Sheet';
import { Card, Fab, GroupLabel, IconButton } from '@/components/ui';
import { goMain } from '@/features/nav';
import { refreshEvents, setEventHidden, useCalendar } from '@/calendar/google';
import { useSnackbar } from '@/components/Snackbar';
import { GoogleFailedCard, lastSeen } from '@/features/calendar/GoogleCards';
import { CarriedOverSheet } from '@/features/sheets/CarriedOverSheet';
import { EventSheet } from '@/features/sheets/EventSheet';
import { eventEnd, eventsOn, eventStart } from '@/lib/events';
import { SetupCheckinsSheet } from '@/features/sheets/SetupCheckinsSheet';
import { leftovers } from '@/lib/checkins';
import { askForNotifications } from '@/notifications/setup';
import { QuickActionsSheet } from '@/features/sheets/QuickActionsSheet';
import { QuickAddSheet } from '@/features/sheets/QuickAddSheet';
import { Timeline } from '@/features/today/Timeline';
import { WeekStrip } from '@/features/today/WeekStrip';
import { useMenu } from '@/features/useMenu';
import { useTaskActions } from '@/features/useTaskActions';
import { addDays, longDate, timeRange, weekdayLong, type DateKey } from '@/lib/dates';
import { inboxOpen } from '@/lib/inboxViews';
import { shortRuleLabel } from '@/lib/repeat';
import { isLive, isOpen, movedLabel, timelineSub, todayView, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { usePendingTaskIds, useSyncStatus } from '@/sync/engine';
import { markCarriedShown, useLocal } from '@/store/local';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import type { Task } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';
import { font } from '@/theme/typography';

/** VToday, with NTodayOtherDay (a day picked in the strip), NTodayDone, NTodayEmpty and NOffline. */
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
  const inbox = useStore((s) => s.inbox);
  const offline = useSyncStatus((s) => s.state) === 'offline';
  const pending = usePendingTaskIds();
  const tasks = visibleTasks(allTasks, lists);
  const [picked, setPicked] = useState<DateKey | null>(null);
  const day = picked && picked !== today ? picked : today;
  const isToday = day === today;

  // NCarriedOver after the check-in moved a task for the 3rd time. Wait for the summary snackbar to settle first.
  const calFailed = useCalendar((s2) => s2.status === 'failed');
  const calFailedDismissed = useCalendar((s2) => s2.failedDismissedOn);
  useEffect(() => {
    void refreshEvents();
  }, [today]);
  const onboarded = useLocal((l) => l.onboarded);
  const checkinsOffered = useLocal((l) => l.checkinsOffered);
  const checkinsSet = useSettings((st) => !!st.morningTime || !!st.afternoonTime);

  // First launch: ask for notification permission once (a designed onboarding flow comes later).
  useEffect(() => {
    if (onboarded) return;
    useLocal.setState({ onboarded: true });
    void askForNotifications().catch(() => false);
  }, [onboarded]);

  // NSetupCheckins: offered once, the first time tasks are left over.
  const leftCount = leftovers(allTasks, lists, today).length;
  useEffect(() => {
    if (!onboarded || checkinsOffered || checkinsSet || !leftCount) return;
    const t = setTimeout(() => {
      useLocal.setState({ checkinsOffered: true });
      sheets.open(() => <SetupCheckinsSheet leftCount={leftCount} />);
    }, 700);
    return () => clearTimeout(t);
  }, [onboarded, checkinsOffered, checkinsSet, leftCount, sheets]);

  const carriedPending = useLocal((l) => l.carriedPending);
  useEffect(() => {
    if (!carriedPending) return;
    const id = carriedPending;
    const t = setTimeout(() => {
      markCarriedShown(id);
      sheets.open(() => <CarriedOverSheet taskId={id} />);
    }, 900);
    return () => clearTimeout(t);
  }, [carriedPending, sheets]);

  // "Add a task" on the 08:30 nothing-planned notification.
  const { add } = useLocalSearchParams<{ add?: string }>();
  useEffect(() => {
    if (add !== '1') return;
    router.setParams({ add: undefined });
    sheets.open(() => <QuickAddSheet />);
  }, [add, sheets]);

  const hasItems = (d: DateKey) => tasks.some((t) => isLive(t) && t.dueDate === d);
  const quickActions = (id: string) => sheets.open(() => <QuickActionsSheet taskId={id} actions={actions} />);
  const listName = (t: Task) => lists.find((l) => l.id === t.listId)?.name;
  const waiting = (t: Task) =>
    offline && pending.has(t.id) ? (
      <>
        <Icon name="cloudWait" size={14} color={c.textSecondary} />
        <AppText tone="secondary" style={{ fontSize: 14 }}>
          waiting to sync
        </AppText>
      </>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: 140 + insets.bottom }}>
        <View style={styles.header}>
          <View style={styles.topRow}>
            <IconButton icon="menu" label="Open menu" iconSize={24} style={{ marginLeft: -10 }} onPress={openMenu} />
            <IconButton icon="search" label="Search" style={{ marginRight: -10 }} onPress={() => goMain('/search')} />
          </View>
          <AppText tone="secondary" style={{ fontSize: 15, marginTop: 16 }}>
            {longDate(day)}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <ContentIn>
              <AppText variant="display" accessibilityRole="header" style={{ marginTop: 4 }}>
                {isToday ? 'Today' : weekdayLong(day)}
              </AppText>
            </ContentIn>
            {!isToday ? (
              <PressScale
                accessibilityRole="button"
                onPress={() => setPicked(null)}
                style={{ marginTop: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.tint, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Icon name="back" size={18} color={c.accentText} />
                <AppText style={{ ...font(800), fontSize: 14, color: c.accentText }}>Back to today</AppText>
              </PressScale>
            ) : null}
          </View>
          {offline ? (
            <View accessibilityRole="text" accessibilityLiveRegion="polite" style={[styles.offline, { backgroundColor: c.fill }]}>
              <Icon name="wifiOff" size={16} color={c.textSecondary} />
              <AppText tone="secondary" style={{ ...font(600), fontSize: 13.5 }}>
                Offline · changes will sync later
              </AppText>
            </View>
          ) : null}
        </View>

        <WeekStrip today={today} selected={day} weekStart={weekStart} hasItems={hasItems} onSelect={(d) => setPicked(d === today ? null : d)} />

        {isToday && calFailed && calFailedDismissed !== today ? <GoogleFailedCard /> : null}

        {isToday ? (
          <TodayBody
            tasks={tasks} today={today} now={now} lists={lists} inboxCount={inboxOpen(inbox).length} quickActions={quickActions} waiting={waiting} onPick={setPicked} />
        ) : (
          <OtherDay day={day} tasks={tasks} listName={listName} quickActions={quickActions} waiting={waiting} />
        )}
      </ScrollView>
      <Fab
        label={isToday ? 'Add task' : `Add task for ${weekdayLong(day)}`}
        onPress={() => sheets.open(() => (isToday ? <QuickAddSheet /> : <QuickAddSheet date={day} />))}
      />
    </View>
  );
}

type Waiting = (t: Task) => React.ReactNode;

function TodayBody({
  tasks,
  today,
  now,
  lists,
  inboxCount,
  quickActions,
  waiting,
  onPick,
}: {
  tasks: Task[];
  today: DateKey;
  now: string;
  lists: ReturnType<typeof useStore.getState>['lists'];
  inboxCount: number;
  quickActions: (id: string) => void;
  waiting: Waiting;
  onPick: (d: DateKey) => void;
}) {
  const { c } = useTheme();
  const actions = useTaskActions();
  const sheets = useSheets();
  const { carried, schedule, anytime, currentId } = todayView(tasks, today, now);
  const snack = useSnackbar();
  const cal = useCalendar();
  const connected = cal.status === 'connected' || cal.status === 'failed';
  const todayEvents = connected ? eventsOn(cal.events, today, cal.hidden).filter((e) => !e.allDay) : [];
  const stale = cal.status === 'failed' ? lastSeen(cal.fetchedAt) : null;
  const all = [...carried, ...schedule, ...anytime];

  // NTodayEmpty: nothing at all today.
  if (!all.length && !todayEvents.length) {
    return (
      <EmptyState
        fill
        icon="sun"
        title="A clear day"
        text="Nothing planned for today. Add something with +, or enjoy it."
        actions={[
          { label: 'Add a task', primary: true, onPress: () => sheets.open(() => <QuickAddSheet />) },
          { label: 'See the week', onPress: () => goMain('/next7') },
        ]}
      />
    );
  }

  // NTodayDone: everything ticked.
  if (all.length && !todayEvents.length && all.every((t) => t.doneAt)) {
    const tomorrow = tasks.filter((t) => isOpen(t) && t.dueDate === addDays(today, 1)).length;
    const done = [...all].sort((a, b) => (a.startTime ?? '99').localeCompare(b.startTime ?? '99'));
    const shown = done.slice(0, 2);
    return (
      <>
        <View accessibilityRole="summary" style={[styles.doneCard, { backgroundColor: c.card }]}>
          <Pop><View aria-hidden style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Icon name="check" size={30} strokeWidth={2.6} color={c.onAccent} />
          </View></Pop>
          <AppText style={{ ...font(800), fontSize: 22 }}>All {all.length} done</AppText>
          <AppText tone="secondary" style={{ fontSize: 14.5, textAlign: 'center' }}>
            Nothing left for today.{tomorrow ? ` Tomorrow has ${tomorrow} task${tomorrow === 1 ? '' : 's'}.` : ''}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Chip label="See tomorrow" onPress={() => onPick(addDays(today, 1))} />
            {inboxCount ? <Chip label={`Sort Inbox · ${inboxCount}`} onPress={() => goMain('/inbox')} /> : null}
          </View>
        </View>
        <GroupLabel>{`Done today · ${all.length}`}</GroupLabel>
        <Card>
          {shown.map((t, i) => (
            <TaskRow
              key={t.id}
              task={t}
              sub={timelineSub(t, lists) || lists.find((l) => l.id === t.listId)?.name}
              last={i === shown.length - 1 && done.length <= 2}
              onOpen={() => actions.openDetails(t.id)}
              onLongPress={() => quickActions(t.id)}
              onToggle={() => actions.toggle(t.id)}
            />
          ))}
          {done.length > 2 ? <ShowMoreRow count={done.length - 2} onPress={() => goMain('/completed')} /> : null}
        </Card>
      </>
    );
  }

  return (
    <>
      {carried.length ? (
        <ContentIn index={1}>
          <GroupLabel style={{ paddingTop: 28, paddingBottom: 12 }}>{`From yesterday · ${carried.length}`}</GroupLabel>
          <Card>
            {carried.map((t, i) => {
              const done = !!t.doneAt;
              const sub = ['Anytime', lists.find((l) => l.id === t.listId)?.name, movedLabel(t.carriedOverCount)].filter(Boolean).join(' · ');
              return (
                <View key={t.id} style={[styles.carriedRow, { backgroundColor: c.tint }, i < carried.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.card }]}>
                  <PressScale
                    kind="row"
                    accessibilityRole="button"
                    accessibilityHint="Opens task details. Long press for quick actions."
                    onPress={() => actions.openDetails(t.id)}
                    onLongPress={() => quickActions(t.id)}
                    style={{ flex: 1 }}
                  >
                    <AppText style={[styles.rowTitle, done && { color: c.textSecondary, textDecorationLine: 'line-through' }]}>{t.title}</AppText>
                    <AppText tone="secondary" variant="secondary" style={{ marginTop: 4 }}>
                      {sub}
                    </AppText>
                  </PressScale>
                  <Check done={done} priority={t.priority} label={t.title} onToggle={() => actions.toggle(t.id)} />
                </View>
              );
            })}
          </Card>
        </ContentIn>
      ) : null}

      {schedule.length || todayEvents.length ? (
        <ContentIn index={1}>
          <GroupLabel style={{ paddingTop: carried.length ? 16 : 28, paddingBottom: 12 }}>Schedule</GroupLabel>
          <Timeline
            tasks={schedule}
            currentId={currentId}
            lists={lists}
            onOpen={actions.openDetails}
            onLongPress={quickActions}
            onToggle={actions.toggle}
            events={todayEvents}
            stale={stale}
            onOpenEvent={(id) => sheets.open(() => <EventSheet eventId={id} />)}
            onHideEvent={(id) => {
              void setEventHidden(id, true);
              snack({ title: 'Hidden from your list', sub: 'Still in Google Calendar', actions: [{ label: 'Undo', onPress: () => void setEventHidden(id, false) }] });
            }}
          />
        </ContentIn>
      ) : null}

      {anytime.length ? (
        <ContentIn index={2}>
          <GroupLabel style={{ paddingTop: schedule.length || todayEvents.length || carried.length ? 16 : 28, paddingBottom: 12 }}>{`Anytime today · ${anytime.length}`}</GroupLabel>
          <Card style={{ paddingVertical: 4, paddingLeft: 20, paddingRight: 12 }}>
            {anytime.map((t, i) => {
              const done = !!t.doneAt;
              const w = waiting(t);
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
                    {w ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>{w}</View> : null}
                  </PressScale>
                  <Check done={done} priority={t.priority} label={t.title} onToggle={() => actions.toggle(t.id)} />
                </View>
              );
            })}
          </Card>
        </ContentIn>
      ) : null}
    </>
  );
}

/** NTodayOtherDay: a day picked in the strip, as plain lists. */
function OtherDay({ day, tasks, listName, quickActions, waiting }: { day: DateKey; tasks: Task[]; listName: (t: Task) => string | undefined; quickActions: (id: string) => void; waiting: Waiting }) {
  const actions = useTaskActions();
  const sheets = useSheets();
  const { c } = useTheme();
  const cal = useCalendar();
  const evs = cal.status === 'connected' || cal.status === 'failed' ? eventsOn(cal.events, day, cal.hidden) : [];
  const dated = tasks.filter((t) => isLive(t) && t.dueDate === day);
  const timed = dated.filter((t) => t.startTime).sort((a, b) => a.startTime!.localeCompare(b.startTime!));
  const untimed = dated.filter((t) => !t.startTime).sort((a, b) => b.priority - a.priority || a.sortOrder - b.sortOrder);
  const sub = (t: Task, withTime: boolean) => {
    const w = waiting(t);
    const text = [withTime ? timelineSub(t, []).split(' · ')[0] : null, listName(t), t.repeatRule ? shortRuleLabel(t.repeatRule).toLowerCase() : null].filter(Boolean).join(' · ');
    return w ? (
      <>
        <AppText tone="secondary" style={{ fontSize: 13.5 }}>
          {text} ·
        </AppText>
        {w}
      </>
    ) : (
      text
    );
  };
  const row = (t: Task, i: number, arr: Task[], withTime: boolean) => (
    <TaskRow
      key={t.id}
      task={t}
      sub={sub(t, withTime)}
      last={i === arr.length - 1}
      onOpen={() => actions.openDetails(t.id)}
      onLongPress={() => quickActions(t.id)}
      onToggle={() => actions.toggle(t.id)}
    />
  );

  if (!dated.length && !evs.length) {
    return (
      <EmptyState
        style={{ marginTop: 26 }}
        icon="calendar"
        title={`Nothing planned for ${weekdayLong(day)}`}
        text="Add something for this day, or leave it free."
        actions={[{ label: `Add to ${weekdayLong(day)}`, primary: true, onPress: () => sheets.open(() => <QuickAddSheet date={day} />) }]}
      />
    );
  }
  return (
    <>
      {timed.length || evs.length ? (
        <>
          <GroupLabel style={{ paddingTop: 26 }}>{`Schedule · ${timed.length + evs.length}`}</GroupLabel>
          <Card>
            {timed.map((t, i, a) => row(t, i, evs.length ? [...a, t] : a, true))}
            {evs.map((e, i) => (
              <PressScale
                key={e.id}
                kind="row"
                accessibilityRole="button"
                accessibilityHint="Opens the Google event"
                onPress={() => sheets.open(() => <EventSheet eventId={e.id} />)}
                style={{ minHeight: 64, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 20, borderTopWidth: i === 0 && timed.length ? 1 : 0, borderBottomWidth: i < evs.length - 1 ? 1 : 0, borderColor: c.ground }}
              >
                <AppText style={{ ...font(700), fontSize: 16 }}>{e.title}</AppText>
                <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 4 }}>
                  {`${e.allDay ? 'All day' : timeRange(eventStart(e), eventEnd(e))} · Google Calendar`}
                </AppText>
              </PressScale>
            ))}
          </Card>
        </>
      ) : null}
      {untimed.length ? (
        <>
          <GroupLabel style={timed.length ? undefined : { paddingTop: 26 }}>{`Anytime · ${untimed.length}`}</GroupLabel>
          <Card>{untimed.map((t, i, a) => row(t, i, a, false))}</Card>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 18, paddingHorizontal: size.sideMargin },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offline: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 6, paddingLeft: 10, paddingRight: 12, borderRadius: 12 },
  anyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  anyTitle: { ...font(600), fontSize: 16 },
  rowTitle: { ...font(700), fontSize: 16, lineHeight: 21 },
  carriedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, paddingLeft: 20, paddingRight: 12 },
  doneCard: { marginTop: 22, marginHorizontal: size.sideMargin, borderRadius: 22, paddingTop: 26, paddingHorizontal: 22, paddingBottom: 20, alignItems: 'center', gap: 6 },
});
