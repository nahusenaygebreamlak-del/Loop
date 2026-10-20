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
import { applyChoices, leftovers, type Choice } from '@/lib/checkins';
import { addDays, daysBetween, uses12h, fromKey, longDate, timeRange, weekdayLong, weekdayShort, weekOf, type DateKey } from '@/lib/dates';
import { eventEnd, eventsOn, eventStart, type GEvent } from '@/lib/events';
import { inboxOpen } from '@/lib/inboxViews';
import { isLive, movedLabel, todayView, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useLocal } from '@/store/local';
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
import { useViewKeys } from '../useDeskKeys';

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
      {isToday ? <CheckinCard today={today} tasks={allTasks} lists={lists} /> : null}

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
              <Schedule tasks={schedule} events={events} currentId={currentId} lists={lists} />
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
                      lists.find((l) => l.id === t.listId) ? (
                        <AppText tone="secondary" style={{ fontSize: 13 }}>
                          {lists.find((l) => l.id === t.listId)?.name}
                        </AppText>
                      ) : null
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
function Schedule({ tasks, events, currentId, lists }: { tasks: Task[]; events: GEvent[]; currentId: string | null; lists: List[] }) {
  const entries = [...tasks.map((t) => ({ at: t.startTime ?? '', t, e: null as GEvent | null })), ...events.map((e) => ({ at: eventStart(e) ?? '', t: null as Task | null, e }))].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <View style={{ gap: 8 }}>
      {entries.map((x) => (x.t ? <ScheduleTask key={x.t.id} task={x.t} now={x.t.id === currentId} lists={lists} /> : <EventRow key={x.e!.id} e={x.e!} />))}
    </View>
  );
}

function ScheduleTask({ task, now, lists }: { task: Task; now: boolean; lists: List[] }) {
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

/** WTodayCheckin: the morning check-in as a quiet card, answered per task. */
function CheckinCard({ today, tasks, lists }: { today: DateKey; tasks: Task[]; lists: List[] }) {
  const { c } = useTheme();
  const snack = useSnackbar();
  const actions = useTaskActions();
  const dismissed = useLocal((l) => l.checkinCardDismissed) === today;
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [all, setAll] = useState(false);
  const [focus, setFocus] = useState(0);
  const left = leftovers(tasks, lists, today);
  // Rows already answered stay in the card with their choice until the card is closed.
  const answeredTasks = Object.keys(answered)
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is Task => !!t && !left.includes(t));
  const rows = [...left, ...answeredTasks];
  const shown = all ? rows : rows.slice(0, 3);
  const open = left.length;

  const apply = (t: Task, choice: Choice, label: string) => {
    const { next, prev } = applyChoices(useStore.getState().tasks, { [t.id]: choice }, today, new Date().toISOString());
    useStore.getState().applyCheckin(next);
    setAnswered((a) => ({ ...a, [t.id]: label }));
    snack({ title: label === 'done' ? 'Task done' : `Moved to ${label === 'today' ? 'today' : 'tomorrow'}`, actions: [{ label: 'Undo', onPress: () => useStore.getState().applyCheckin(prev) }] });
  };
  const moveAll = () => {
    const { next, prev } = applyChoices(useStore.getState().tasks, Object.fromEntries(left.map((t) => [t.id, 'today' as const])), today, new Date().toISOString());
    useStore.getState().applyCheckin(next);
    setAnswered((a) => ({ ...a, ...Object.fromEntries(left.map((t) => [t.id, 'today'])) }));
    snack({ title: `Moved ${left.length} task${left.length === 1 ? '' : 's'} to today`, actions: [{ label: 'Undo', onPress: () => useStore.getState().applyCheckin(prev) }] });
  };
  const notNow = () => useLocal.setState({ checkinCardDismissed: today });
  const pick = (t: Task) => actions.pickDate(t.id);

  useViewKeys(
    !dismissed && open
      ? (k) => {
          const t = shown.filter((x) => left.includes(x))[Math.min(focus, open - 1)] ?? left[0];
          if (k === 'a') return moveAll(), true;
          if (!t) return false;
          if (k === '1') return apply(t, 'today', 'today'), true;
          if (k === '2') return apply(t, { date: addDays(today, 1) }, 'tomorrow'), true;
          if (k === '3') return pick(t), true;
          return false;
        }
      : null,
  );

  if (dismissed || !open) return null;
  const chip = (label: string, on: boolean, onPress: () => void, tone?: 'warn') => (
    <PressScale
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{ minHeight: 34, paddingHorizontal: 12, borderRadius: 14, justifyContent: 'center', backgroundColor: on ? c.accent : tone === 'warn' ? c.warnTint : c.ground }}
    >
      <AppText style={{ ...font(700), fontSize: 13, color: on ? c.onAccent : tone === 'warn' ? c.warnText : c.text }}>{label}</AppText>
    </PressScale>
  );

  return (
    <View accessibilityLabel="Morning check-in" style={{ marginTop: 20, backgroundColor: c.card, borderRadius: 20, paddingTop: 18, paddingRight: 18, paddingBottom: 14, paddingLeft: 20, borderWidth: 2, borderColor: c.tint }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View aria-hidden style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="repeat" size={18} color={c.accentText} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={{ ...font(800), fontSize: 16 }}>{`${open} task${open === 1 ? '' : 's'} left ${left.every((t) => daysBetween(t.dueDate!, today) === 1) ? 'from yesterday' : 'over'}`}</AppText>
          <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 2 }}>
            Morning check-in · decide here, or they stay where they are
          </AppText>
        </View>
        <PressScale accessibilityRole="button" accessibilityHint="Shortcut A" onPress={moveAll} style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.accent, justifyContent: 'center' }}>
          <AppText style={{ ...font(800), fontSize: 13.5, color: c.onAccent }}>Move all to today</AppText>
        </PressScale>
        <PressScale accessibilityRole="button" onPress={notNow} style={{ minHeight: 38, paddingHorizontal: 12, borderRadius: 12, justifyContent: 'center' }}>
          <AppText tone="secondary" style={{ ...font(700), fontSize: 13.5 }}>
            Not now
          </AppText>
        </PressScale>
      </View>
      <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: c.ground }}>
        {shown.map((t, i) => {
          const late = t.dueDate ? daysBetween(t.dueDate, today) : 0;
          const list = lists.find((l) => l.id === t.listId)?.name;
          const moved = t.carriedOverCount >= 2;
          const choice = answered[t.id];
          return (
            <Pressable
              key={t.id}
              onHoverIn={() => setFocus(i)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingVertical: 6, borderBottomWidth: i < shown.length - 1 ? 1 : 0, borderBottomColor: c.ground }}
            >
              <View style={{ flex: 1 }}>
                <AppText style={{ ...font(700), fontSize: 14.5 }}>{t.title}</AppText>
                <AppText style={{ fontSize: 12.5, marginTop: 2, color: moved ? c.warnText : c.textSecondary }}>
                  {[list, moved ? `moved ${t.carriedOverCount + (choice ? 0 : 1)} times` : late <= 1 ? 'yesterday' : `${late} days late`].filter(Boolean).join(' · ')}
                </AppText>
              </View>
              {chip('Today', choice === 'today', () => apply(t, 'today', 'today'))}
              {chip('Tomorrow', choice === 'tomorrow', () => apply(t, { date: addDays(today, 1) }, 'tomorrow'))}
              {chip('Pick day', false, () => pick(t))}
              {moved && !choice
                ? chip(
                    'Back to Inbox',
                    false,
                    () => {
                      const undo = useStore.getState().taskBackToInbox(t.id);
                      snack({ title: 'Back in Inbox', actions: [{ label: 'Undo', onPress: undo }] });
                    },
                    'warn',
                  )
                : null}
              <Check done={choice === 'done' || !!t.doneAt} priority={t.priority} label={t.title} onToggle={() => apply(t, 'done', 'done')} />
            </Pressable>
          );
        })}
        {rows.length > 3 ? (
          <PressScale accessibilityRole="button" onPress={() => setAll((v) => !v)} style={{ paddingTop: 8, paddingBottom: 2, alignSelf: 'flex-start' }}>
            <AppText style={{ ...font(700), fontSize: 13, color: c.accentText }}>{all ? 'Show fewer' : `Show ${rows.length - 3} more`}</AppText>
          </PressScale>
        ) : null}
      </View>
    </View>
  );
}

