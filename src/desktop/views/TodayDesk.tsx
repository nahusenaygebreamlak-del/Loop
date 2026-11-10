import { useEffect, useState } from 'react';
import { Pressable, View, type ViewInstance } from 'react-native';
import { AppText } from '@/components/AppText';
import { Check } from '@/components/Check';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useSnackbar } from '@/components/Snackbar';
import { refreshEvents, setEventHidden, useCalendar } from '@/calendar/google';
import { goMain } from '@/features/nav';
import { useTaskActions } from '@/features/useTaskActions';
import { leftovers } from '@/lib/checkins';
import { planRow, useFromPlan } from '@/features/coach/useDayPlan';
import { cardLine, isAnswered, yesterdayRange, yesterdaySummary } from '@/lib/debrief';
import { addDays, uses12h, fromKey, longDate, timeRange, toKey, weekdayLong, weekdayShort, weekOf, type DateKey } from '@/lib/dates';
import { eventEnd, eventsOn, eventStart, type GEvent } from '@/lib/events';
import { inboxOpen } from '@/lib/inboxViews';
import { isLive, movedLabel, todayView, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import type { List, Task } from '@/store/types';
import { usePendingTaskIds, useSyncStatus } from '@/sync/engine';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { useContextMenu, useDraggable } from '../dom';
import { KeyHints } from '../Kbd';
import { useOpenTaskMenu } from '../Menu';
import { openQuickAdd, selectTask, useDeskState } from '../state';
import { Banner, DeskCard, DeskEmpty, DeskHeader, DeskPage, GroupLab, KeyButton, SoftButton, TaskRowDesk, useRows } from '../ui';

// 52 px fits "10:00"; 12-hour times ("10:00 AM") need more.
const timeCol = () => (uses12h() ? 70 : 52);

/** WToday, WTodayCheckin, WTodayDone, WTodayEmpty, WOffline. */
export function TodayDesk() {
  const { c } = useTheme();
  const { today, now } = useToday();
  const weekStart = useSettings((s) => s.weekStart);
  const allTasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const inbox = useStore((s) => s.inbox);
  const cal = useCalendar();
  const offline = useSyncStatus((s) => s.state) === 'offline';
  const waitingCount = usePendingTaskIds().size;
  const [picked, setPicked] = useState<DateKey | null>(null);
  const [showDone, setShowDone] = useState(false);
  const day = picked ?? today;
  const isToday = day === today;
  const tasks = visibleTasks(allTasks, lists);
  const connected = cal.status === 'connected' || cal.status === 'failed';
  const events = connected ? eventsOn(cal.events, day, cal.hidden).filter((e) => !e.allDay) : [];
  const inboxCount = inboxOpen(inbox).length;
  const fromPlan = useFromPlan(today);

  useEffect(() => {
    void refreshEvents();
  }, [today]);

  const { carried, schedule, anytime, currentId } = todayView(tasks, day, isToday ? now : '00:00');
  const dayTasks = [...carried, ...schedule, ...anytime];
  const anyAll = [...carried, ...anytime];
  const allDone = dayTasks.length > 0 && dayTasks.every((t) => t.doneAt);
  useRows([...schedule, ...anyAll].filter((t) => !t.doneAt || !allDone).map((t) => t.id));

  const header = (
    <DeskHeader pre={longDate(day)} title={isToday ? 'Today' : weekdayLong(day)} actions={<KeyButton label="Add task" k="Q" onPress={() => openQuickAdd({ date: isToday ? null : day })} />} />
  );

  return (
    <DeskPage>
      {header}
      {offline ? (
        <Banner
          icon="wifiOff"
          iconBg={c.warnTint}
          iconFg={c.warnText}
          title="You're offline"
          text={waitingCount ? `Keep working. ${waitingCount} change${waitingCount === 1 ? ' is' : 's are'} saved on this computer and will sync when you're back.` : "Keep working. Changes are saved on this computer and will sync when you're back."}
          right={
            <AppText tone="secondary" style={{ ...font(700), fontSize: 13, paddingHorizontal: 8 }}>
              Trying again soon
            </AppText>
          }
        />
      ) : null}
      {isToday ? <DebriefCard today={today} tasks={allTasks} lists={lists} /> : null}

      {allDone && isToday ? (
        <>
          <DeskEmpty tick title="All done for today" text={`${dayTasks.length} task${dayTasks.length === 1 ? '' : 's'} finished. The afternoon check-in won't bother you.`}>
            <SoftButton onCard label="Look at tomorrow" onPress={() => setPicked(addDays(today, 1))} />
            {inboxCount ? <SoftButton onCard label={`Sort Inbox · ${inboxCount}`} onPress={() => goMain('/inbox')} /> : null}
          </DeskEmpty>
          {events.length ? (
            <>
              <GroupLab first>Still on your calendar</GroupLab>
              <View style={{ gap: 8 }}>
                {events.map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
              </View>
            </>
          ) : null}
          <PressScale accessibilityRole="button" onPress={() => setShowDone((v) => !v)} style={{ marginTop: 18, alignSelf: 'flex-start' }}>
            <AppText style={{ ...font(700), fontSize: 13.5, color: c.accentText }}>{showDone ? 'Hide completed' : `Show ${dayTasks.length} completed`}</AppText>
          </PressScale>
          {showDone ? (
            <DeskCard style={{ marginTop: 10 }}>
              {dayTasks.map((t, i) => (
                <TaskRowDesk key={t.id} task={t} last={i === dayTasks.length - 1} />
              ))}
            </DeskCard>
          ) : null}
        </>
      ) : !dayTasks.length && !events.length ? (
        <>
          <WeekStripDesk today={today} day={day} weekStart={weekStart} tasks={tasks} onPick={(d) => setPicked(d === today ? null : d)} />
          <DeskEmpty icon={isToday ? 'sun' : 'calendar'} title={isToday ? 'Nothing planned for today' : `Nothing planned for ${weekdayLong(day)}`} text="Add what you want to get done, or pull something in from your Inbox or other days.">
            <KeyButton label="Add task" k="Q" onPress={() => openQuickAdd({ date: isToday ? null : day })} />
            {inboxCount ? <SoftButton onCard label={`Sort Inbox · ${inboxCount}`} onPress={() => goMain('/inbox')} /> : null}
            <SoftButton onCard label="See next 7 days" onPress={() => goMain('/next7')} />
          </DeskEmpty>
        </>
      ) : (
        <>
          <WeekStripDesk today={today} day={day} weekStart={weekStart} tasks={tasks} onPick={(d) => setPicked(d === today ? null : d)} />
          {schedule.length || events.length ? (
            <>
              <GroupLab first>Schedule</GroupLab>
              <Schedule tasks={schedule} events={events} currentId={currentId} lists={lists} fromPlan={isToday ? fromPlan : undefined} />
            </>
          ) : null}
          {anyAll.length ? (
            <>
              <GroupLab first>{`${isToday ? 'Anytime today' : 'Anytime'} · ${anyAll.length}`}</GroupLab>
              <DeskCard>
                {anyAll.map((t, i) => (
                  <TaskRowDesk
                    key={t.id}
                    task={t}
                    last={i === anyAll.length - 1}
                    sub={t.carriedAt === day && t.carriedOverCount >= 2 ? `From yesterday · ${movedLabel(t.carriedOverCount)}` : undefined}
                    subTone="warn"
                    right={
                      <>
                        {isToday && fromPlan.has(t.id) ? <PlanChip /> : null}
                        {lists.find((l) => l.id === t.listId) ? (
                          <AppText tone="secondary" style={{ fontSize: 13 }}>
                            {lists.find((l) => l.id === t.listId)?.name}
                          </AppText>
                        ) : null}
                      </>
                    }
                  />
                ))}
              </DeskCard>
            </>
          ) : null}
          <KeyHints
            items={[
              [['↑', '↓'], 'move'],
              [['Space'], 'done'],
              [['D'], 'date'],
              [['M'], 'list'],
              [['P'], 'priority'],
              [['Del'], 'delete'],
            ]}
          />
        </>
      )}
    </DeskPage>
  );
}

function WeekStripDesk({ today, day, weekStart, tasks, onPick }: { today: DateKey; day: DateKey; weekStart: number; tasks: Task[]; onPick: (d: DateKey) => void }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="tablist" accessibilityLabel="This week" style={{ flexDirection: 'row', gap: 6, marginTop: 20, backgroundColor: c.card, borderRadius: 18, padding: 8 }}>
      {weekOf(today, weekStart).map((d) => {
        const sel = d === day;
        const isToday = d === today;
        const has = tasks.some((t) => isLive(t) && t.dueDate === d);
        const fg = sel ? c.onAccent : isToday ? c.accentText : c.text;
        return (
          <PressScale
            key={d}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
            accessibilityLabel={`${weekdayLong(d)} ${fromKey(d).getDate()}`}
            onPress={() => onPick(d)}
            style={{ flex: 1, paddingVertical: 6, alignItems: 'center', gap: 6, borderRadius: 14, backgroundColor: sel ? c.accent : 'transparent' }}
          >
            <AppText style={{ fontSize: 13, color: sel ? c.onAccentSecondary : isToday ? c.accentText : c.textSecondary }}>{weekdayShort(d)}</AppText>
            <AppText style={{ ...font(700), fontSize: 17, color: fg }}>{fromKey(d).getDate()}</AppText>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: sel ? c.onAccent : has ? (isToday ? c.accent : c.line) : 'transparent' }} />
          </PressScale>
        );
      })}
    </View>
  );
}

/** Schedule rows: time on the left, the current task filled blue, Google events in grey. */
function Schedule({ tasks, events, currentId, lists, fromPlan }: { tasks: Task[]; events: GEvent[]; currentId: string | null; lists: List[]; fromPlan?: Set<string> }) {
  const entries = [...tasks.map((t) => ({ at: t.startTime ?? '', t, e: null as GEvent | null })), ...events.map((e) => ({ at: eventStart(e) ?? '', t: null as Task | null, e }))].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <View style={{ gap: 8 }}>
      {entries.map((x) => (x.t ? <ScheduleTask key={x.t.id} task={x.t} now={x.t.id === currentId} lists={lists} planned={!!fromPlan?.has(x.t.id)} /> : <EventRow key={x.e!.id} e={x.e!} />))}
    </View>
  );
}

function ScheduleTask({ task, now, lists, planned }: { task: Task; now: boolean; lists: List[]; planned: boolean }) {
  const { c } = useTheme();
  const actions = useTaskActions();
  const openMenu = useOpenTaskMenu();
  const selected = useDeskState((s) => s.selected?.kind === 'task' && s.selected.id === task.id);
  const dragRef = useDraggable<ViewInstance>({ kind: 'task', id: task.id });
  const menuRef = useContextMenu<ViewInstance>((x, y) => openMenu(task.id, x, y));
  const list = lists.find((l) => l.id === task.listId)?.name;
  const subs = task.subtasks.length ? `${task.subtasks.filter((s) => s.doneAt).length} of ${task.subtasks.length} subtasks` : null;
  const done = !!task.doneAt;
  const fg = now ? c.onAccent : done ? c.textSecondary : c.text;
  const fg2 = now ? c.onAccentSecondary : c.textSecondary;
  return (
    <View ref={dragRef}>
      <View ref={menuRef}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          {...({ dataSet: { looprow: '1' } } as object)}
          onPress={() => selectTask(task.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: 18,
            paddingVertical: 10,
            paddingLeft: 18,
            paddingRight: 10,
            backgroundColor: now ? c.accent : selected ? c.tint : c.card,
            outlineWidth: now || selected ? 3 : 0,
            outlineStyle: 'solid',
            outlineColor: c.tint,
            outlineOffset: 2,
            cursor: 'pointer',
          } as object}
        >
          <AppText numberOfLines={1} style={{ width: timeCol(), ...font(700), fontSize: 13.5, color: fg2 }}>{timeRange(task.startTime, null)}</AppText>
          <View style={{ flex: 1 }}>
            <AppText style={{ ...font(700), fontSize: 15.5, color: fg, textDecorationLine: done ? 'line-through' : 'none' }}>{task.title}</AppText>
            <AppText style={{ fontSize: 13.5, marginTop: 3, color: fg2 }}>{[timeRange(task.startTime, task.endTime), list, subs].filter(Boolean).join(' · ')}</AppText>
          </View>
          {planned && !now ? <PlanChip /> : null}
          <Check done={done} priority={task.priority} onAccent={now} label={task.title} onToggle={() => actions.toggle(task.id)} />
        </Pressable>
      </View>
    </View>
  );
}

function EventRow({ e }: { e: GEvent }) {
  const { c } = useTheme();
  const snack = useSnackbar();
  const selected = useDeskState((s) => s.selected?.kind === 'event' && s.selected.id === e.id);
  const stale = useCalendar((s) => s.status === 'failed');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => useDeskState.setState({ selected: { kind: 'event', id: e.id } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingVertical: 10, paddingLeft: 18, paddingRight: 10, backgroundColor: selected ? c.tint : c.desk.eventRow, opacity: stale ? 0.6 : 1, cursor: 'pointer' } as object}
    >
      <AppText tone="secondary" numberOfLines={1} style={{ width: timeCol(), ...font(700), fontSize: 13.5 }}>
        {timeRange(eventStart(e), null)}
      </AppText>
      <View style={{ flex: 1 }}>
        <AppText style={{ ...font(700), fontSize: 15.5 }}>{e.title}</AppText>
        <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 3 }}>{`${timeRange(eventStart(e), eventEnd(e))} · Google Calendar`}</AppText>
      </View>
      <Check
        done={false}
        label={`Hide ${e.title} from your list`}
        onToggle={() => {
          void setEventHidden(e.id, true);
          snack({ title: 'Hidden from your list', sub: 'Still in Google Calendar', actions: [{ label: 'Undo', onPress: () => void setEventHidden(e.id, false) }] });
        }}
      />
    </Pressable>
  );
}

/** WCDebriefCard: "Good morning", one summary line and Open debrief (D). Collapses once the debrief is answered. */
function DebriefCard({ today, tasks, lists }: { today: DateKey; tasks: Task[]; lists: List[] }) {
  const { c } = useTheme();
  const weekends = useSettings((s) => s.weekends);
  const debriefs = useStore((s) => s.debriefs);
  const planAdded = useStore((s) => (planRow(s.debriefs, today)?.planState.accepted?.length ?? 0) > 0);
  const answered = isAnswered(debriefs, today);
  const range = yesterdayRange(today, weekends);
  const line = cardLine(leftovers(tasks, lists, today).length, yesterdaySummary(tasks, range, (iso) => toKey(new Date(iso))), range);
  const open = () => goMain('/debrief');

  if (answered) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, marginTop: 20, paddingLeft: 18, paddingRight: 10, borderRadius: 16, backgroundColor: c.tint }}>
        <View aria-hidden style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={14} strokeWidth={3} color={c.onAccent} />
        </View>
        <AppText style={{ ...font(700), fontSize: 14.5, flex: 1 }}>{planAdded ? 'Debrief done · Plan added' : 'Debrief done'}</AppText>
        <PressScale accessibilityRole="button" accessibilityLabel="Open the debrief" onPress={open} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' }}>
          <AppText style={{ ...font(700), fontSize: 14, color: c.accentText }}>Open</AppText>
        </PressScale>
      </View>
    );
  }
  return (
    <View accessibilityLabel="Morning debrief" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20, backgroundColor: c.card, borderRadius: 20, paddingVertical: 16, paddingRight: 16, paddingLeft: 20, borderWidth: 2, borderColor: c.tint }}>
      <View aria-hidden style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="sun" size={20} color={c.accentText} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ ...font(800), fontSize: 16 }}>Good morning</AppText>
        <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 2 }}>
          {line}
        </AppText>
      </View>
      <KeyButton small icon={null} label="Open debrief" k="D" onPress={open} />
    </View>
  );
}

/** "From the plan": tasks the coach's plan put on today keep this chip for the rest of the day. */
function PlanChip() {
  const { c } = useTheme();
  return (
    <View style={{ minHeight: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: c.tint, justifyContent: 'center' }}>
      <AppText style={{ ...font(700), fontSize: 12, color: c.accentText }}>From the plan</AppText>
    </View>
  );
}
