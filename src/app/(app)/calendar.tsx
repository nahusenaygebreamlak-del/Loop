import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, ScrollView, View, type ScrollViewInstance, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Check } from '@/components/Check';
import { IconButton, Fab } from '@/components/ui';
import { PulseDot } from '@/components/Motion';
import { PressScale } from '@/components/PressScale';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { refreshEvents, setEventHidden, useCalendar } from '@/calendar/google';
import { GoogleFailedCard, lastSeen, SetupGoogleCard } from '@/features/calendar/GoogleCards';
import { EventSheet } from '@/features/sheets/EventSheet';
import { QuickAddSheet } from '@/features/sheets/QuickAddSheet';
import { useMenu } from '@/features/useMenu';
import { useTaskActions } from '@/features/useTaskActions';
import {
  addDays,
  formatTime,
  fromKey,
  minutesToTime,
  monthDay,
  monthGrid,
  monthName,
  nowTime,
  relativeDay,
  shortDate,
  timeRange,
  timeToMinutes,
  weekdayLong,
  weekdayShort,
  weekOf,
  type DateKey,
} from '@/lib/dates';
import { eventDay, eventEnd, eventsOn, eventStart, type GEvent } from '@/lib/events';
import { isLive, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import type { List, Task } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

type View_ = 'month' | 'week' | 'day';
type Item = { kind: 'task'; task: Task; start: string | null; end: string | null } | { kind: 'event'; event: GEvent; start: string | null; end: string | null };

/** Tasks and Google events on one day, timed ones in time order after all-day/anytime ones. */
function itemsOn(day: DateKey, tasks: Task[], events: GEvent[], hidden: string[]): Item[] {
  const t: Item[] = tasks.filter((x) => isLive(x) && x.dueDate === day).map((task) => ({ kind: 'task', task, start: task.startTime, end: task.endTime }));
  const e: Item[] = eventsOn(events, day, hidden).map((event) => ({ kind: 'event', event, start: eventStart(event), end: eventEnd(event) }));
  return [...t, ...e].sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));
}

/** VCalendar (month), NCalWeek, NCalDay, with NSetupGoogle / NCalendarConnected / NGoogleFailed. */
export default function Calendar() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const openMenu = useMenu();
  const sheets = useSheets();
  const snack = useSnackbar();
  const params = useLocalSearchParams<{ view?: View_ }>();
  const { today } = useToday();
  const weekStart = useSettings((s) => s.weekStart);
  const allTasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const cal = useCalendar();
  const [view, setView] = useState<View_>(params.view ?? 'month');
  const [day, setDay] = useState<DateKey>(today);
  const [month, setMonth] = useState(() => ({ y: fromKey(today).getFullYear(), m: fromKey(today).getMonth() }));
  const tasks = visibleTasks(allTasks, lists);
  const connected = cal.status === 'connected' || cal.status === 'failed';
  const events = connected ? cal.events : [];

  useEffect(() => {
    void refreshEvents();
  }, []);

  // NCalendarConnected: "Google Calendar connected · Showing 3 calendars · Choose".
  useEffect(() => {
    if (!cal.justConnected) return;
    useCalendar.setState({ justConnected: false });
    const n = cal.calendars.filter((x) => x.enabled).length;
    snack({ title: 'Google Calendar connected', sub: `Showing ${n} calendar${n === 1 ? '' : 's'}`, actions: [{ label: 'Choose', onPress: () => router.push('/settings/account') }] });
  }, [cal.justConnected, cal.calendars, snack]);

  const pick = (d: DateKey) => {
    setDay(d);
    setMonth({ y: fromKey(d).getFullYear(), m: fromKey(d).getMonth() });
  };
  const goToday = () => pick(today);
  const step = (n: number) => {
    if (view === 'month') {
      const d = new Date(month.y, month.m + n, 1);
      setMonth({ y: d.getFullYear(), m: d.getMonth() });
    } else pick(addDays(day, view === 'week' ? 7 * n : n));
  };

  const week = weekOf(day, weekStart);
  const title =
    view === 'month' ? monthName(month.m) : view === 'week' ? weekTitle(week[0], week[6]) : shortDate(day);

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <View style={{ paddingTop: insets.top + 18, paddingHorizontal: size.sideMargin }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="menu" label="Open menu" iconSize={24} style={{ marginLeft: -10 }} onPress={openMenu} />
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <IconButton icon="back" label={`Previous ${view}`} onPress={() => step(-1)} />
            <IconButton icon="forward" label={`Next ${view}`} onPress={() => step(1)} />
            {view !== 'day' || day !== today ? (
              <PressScale accessibilityRole="button" onPress={goToday} style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.card, justifyContent: 'center' }}>
                <AppText style={{ ...font(700), fontSize: 14, color: c.accentText }}>Today</AppText>
              </PressScale>
            ) : null}
          </View>
        </View>
        {view === 'day' ? (
          <AppText tone="secondary" style={{ fontSize: 15, marginTop: 10 }}>
            {relativeDay(day, today).includes(',') ? weekdayLong(day) : relativeDay(day, today)}
          </AppText>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: view === 'day' ? 2 : 14 }}>
          <AppText variant="display" accessibilityRole="header">
            {title}
          </AppText>
          {view === 'month' ? (
            <AppText tone="secondary" style={{ ...font(600), fontSize: 18 }}>
              {month.y}
            </AppText>
          ) : null}
        </View>
      </View>

      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, marginTop: 18, marginHorizontal: size.sideMargin, padding: 4, borderRadius: 15, backgroundColor: c.cal.segBg }}>
        {(['month', 'week', 'day'] as const).map((v) => {
          const on = v === view;
          return (
            <PressScale
              key={v}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setView(v)}
              style={{ flex: 1, minHeight: 40, borderRadius: 12, backgroundColor: on ? c.card : 'transparent', alignItems: 'center', justifyContent: 'center' }}
            >
              <AppText style={{ ...font(on ? 700 : 600), fontSize: 14, color: on ? c.text : c.textSecondary }}>{v[0].toUpperCase() + v.slice(1)}</AppText>
            </PressScale>
          );
        })}
      </View>

      {view === 'month' ? (
        <MonthView
          month={month}
          day={day}
          today={today}
          weekStart={weekStart}
          tasks={tasks}
          lists={lists}
          events={events}
          hidden={cal.hidden}
          status={cal.status}
          showSetup={cal.status === 'off' && !cal.setupDismissed}
          stale={cal.status === 'failed' ? lastSeen(cal.fetchedAt) : null}
          onPick={pick}
        />
      ) : view === 'week' ? (
        <WeekView week={week} today={today} tasks={tasks} events={events} hidden={cal.hidden} onPickDay={(d) => (pick(d), setView('day'))} />
      ) : (
        <DayView day={day} today={today} tasks={tasks} lists={lists} events={events} hidden={cal.hidden} />
      )}

      <Fab
        label={day === today ? 'Add task' : `Add task for ${weekdayLong(day)}`}
        onPress={() => sheets.open(() => (day === today ? <QuickAddSheet /> : <QuickAddSheet date={day} />))}
      />
    </View>
  );
}

/** "16:00", or "4 PM" in 12-hour mode (short enough for the grid's label column). */
function hourLabel(h: number, short = false): string {
  const t = formatTime(`${String(h).padStart(2, '0')}:00`);
  if (t.endsWith('M')) return t.replace(':00', '');
  return short ? t.slice(0, 2) : t;
}

function weekTitle(a: DateKey, b: DateKey): string {
  const A = fromKey(a);
  const B = fromKey(b);
  return A.getMonth() === B.getMonth() ? `${monthDay(a)} – ${B.getDate()}` : `${monthDay(a)} – ${monthDay(b)}`;
}

// ─── Month ───────────────────────────────────────────────────────────────────

function MonthView({
  month,
  day,
  today,
  weekStart,
  tasks,
  lists,
  events,
  hidden,
  status,
  showSetup,
  stale,
  onPick,
}: {
  month: { y: number; m: number };
  day: DateKey;
  today: DateKey;
  weekStart: number;
  tasks: Task[];
  lists: List[];
  events: GEvent[];
  hidden: string[];
  status: string;
  showSetup: boolean;
  stale: string | null;
  onPick: (d: DateKey) => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const snack = useSnackbar();
  const actions = useTaskActions();
  const cells = useMemo(() => monthGrid(month.y, month.m, weekStart), [month.y, month.m, weekStart]);
  const taskDays = useMemo(() => new Set(tasks.filter((t) => isLive(t) && !t.doneAt && t.dueDate).map((t) => t.dueDate!)), [tasks]);
  const eventDays = useMemo(() => new Set(events.filter((e) => !hidden.includes(e.id)).map(eventDay)), [events, hidden]);
  const items = itemsOn(day, tasks, events, hidden);
  const connected = status === 'connected' || status === 'failed';
  const heads = weekOf(today, weekStart).map((d) => weekdayShort(d)[0]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 130 + insets.bottom }} showsVerticalScrollIndicator={false}>
      {showSetup ? <SetupGoogleCard /> : null}
      {status === 'failed' ? <GoogleFailedCard /> : null}
      <View style={{ marginTop: 14, marginHorizontal: size.sideMargin, backgroundColor: c.card, borderRadius: 22, paddingTop: 16, paddingHorizontal: 10, paddingBottom: 8, opacity: showSetup ? 0.55 : 1 }}>
        <View style={{ flexDirection: 'row' }} aria-hidden>
          {heads.map((h, i) => (
            <AppText key={i} tone="secondary" style={{ flex: 1, textAlign: 'center', ...font(600), fontSize: 12.5, paddingTop: 2, paddingBottom: 8 }}>
              {h}
            </AppText>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((cell) => {
            const sel = cell.key === day;
            const isToday = cell.key === today;
            const t = taskDays.has(cell.key);
            const e = eventDays.has(cell.key);
            return (
              <PressScale
                key={cell.key}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={`${shortDate(cell.key)}${t ? ', has tasks' : ''}${e ? ', has events' : ''}`}
                onPress={() => onPick(cell.key)}
                style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', gap: 3 }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? c.accent : 'transparent' }}>
                  <AppText
                    style={{
                      ...font(isToday && !sel ? 800 : 600),
                      fontSize: 14.5,
                      fontVariant: ['tabular-nums'],
                      color: sel ? c.onAccent : isToday ? c.accentText : cell.inMonth ? c.text : c.line,
                    }}
                  >
                    {fromKey(cell.key).getDate()}
                  </AppText>
                </View>
                <View aria-hidden style={{ flexDirection: 'row', gap: 3, height: 4 }}>
                  {t ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.accent }} /> : null}
                  {e ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.cal.eventDot }} /> : null}
                </View>
              </PressScale>
            );
          })}
        </View>
        {connected ? (
          <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', paddingTop: 8, paddingBottom: 4 }}>
            {[
              ['Tasks', c.accent],
              ['Google events', c.cal.eventDot],
            ].map(([label, color]) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
                <AppText tone="secondary" style={{ ...font(600), fontSize: 12.5 }}>
                  {label}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <AppText tone="secondary" accessibilityRole="header" style={{ ...font(700), fontSize: 14, paddingTop: 22, paddingBottom: 10, paddingHorizontal: size.sideMargin }}>
        {`${weekdayLong(day)}, ${monthDay(day)}`}
      </AppText>
      <View style={{ paddingHorizontal: size.sideMargin, gap: 10 }}>
        {items.length === 0 ? (
          <View style={{ backgroundColor: c.card, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 18 }}>
            <AppText tone="secondary" style={{ fontSize: 14.5 }}>
              Nothing planned
            </AppText>
          </View>
        ) : null}
        {items.map((it) =>
          it.kind === 'task' ? (
            <AgendaRow
              key={it.task.id}
              title={it.task.title}
              done={!!it.task.doneAt}
              sub={[it.start ? timeRange(it.start, it.end) : 'Anytime', lists.find((l) => l.id === it.task.listId)?.name].filter(Boolean).join(' · ')}
              swatch={lists.find((l) => l.id === it.task.listId)?.color}
              onOpen={() => actions.openDetails(it.task.id)}
              check={<Check done={!!it.task.doneAt} priority={it.task.priority} label={it.task.title} onToggle={() => actions.toggle(it.task.id)} />}
            />
          ) : (
            <AgendaRow
              key={it.event.id}
              event
              stale={!!stale}
              title={it.event.title}
              sub={`${it.event.allDay ? 'All day' : timeRange(it.start, it.end)} · ${stale ? `Google · last seen ${stale}` : 'Google Calendar'}`}
              onOpen={() => sheets.open(() => <EventSheet eventId={it.event.id} />)}
              check={
                stale ? null : (
                  <Check
                    done={false}
                    label={`Hide ${it.event.title} from your list`}
                    onToggle={() => {
                      void setEventHidden(it.event.id, true);
                      snack({ title: 'Hidden from your list', sub: 'Still in Google Calendar', actions: [{ label: 'Undo', onPress: () => void setEventHidden(it.event.id, false) }] });
                    }}
                  />
                )
              }
            />
          ),
        )}
      </View>
    </ScrollView>
  );
}

function AgendaRow({
  title,
  sub,
  done,
  event,
  stale,
  swatch,
  check,
  onOpen,
}: {
  title: string;
  sub: string;
  done?: boolean;
  event?: boolean;
  stale?: boolean;
  swatch?: keyof typeof listColors;
  check: React.ReactNode;
  onOpen: () => void;
}) {
  const { c } = useTheme();
  void swatch;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingRight: 10, paddingLeft: 18, borderRadius: 18, backgroundColor: event ? c.cal.agendaEvent : c.card, opacity: stale ? 0.55 : 1 }}>
      <PressScale kind="row" accessibilityRole="button" accessibilityHint={event ? 'Opens the event' : 'Opens task details'} onPress={onOpen} style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}>
        <AppText style={{ ...font(700), fontSize: 15.5, color: done ? c.textSecondary : c.text, textDecorationLine: done ? 'line-through' : 'none' }}>{title}</AppText>
        <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 4 }}>
          {sub}
        </AppText>
      </PressScale>
      {check ?? <View style={{ width: 44 }} />}
    </View>
  );
}

// ─── Week ────────────────────────────────────────────────────────────────────

const W_HOUR = 44;

type Block = { id: string; title: string; start: number; end: number; kind: 'task' | 'event' | 'now'; onPress: () => void; lane: number; lanes: number };

/** Side-by-side lanes for overlapping blocks. */
function layout(blocks: Omit<Block, 'lane' | 'lanes'>[]): Block[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Block[] = [];
  let group: Block[] = [];
  let groupEnd = -1;
  const flush = () => {
    const n = Math.max(1, ...group.map((g) => g.lane + 1));
    group.forEach((g) => (g.lanes = n));
    group = [];
  };
  for (const b of sorted) {
    if (b.start >= groupEnd) {
      flush();
      groupEnd = -1;
    }
    const used = new Set(group.filter((g) => g.end > b.start).map((g) => g.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    const placed: Block = { ...b, lane, lanes: 1 };
    group.push(placed);
    out.push(placed);
    groupEnd = Math.max(groupEnd, b.end);
  }
  flush();
  return out;
}

function timedBlocks(day: DateKey, today: DateKey, tasks: Task[], events: GEvent[], hidden: string[], openTask: (id: string) => void, openEvent: (id: string) => void) {
  const nowMin = timeToMinutes(nowTime());
  const raw: Omit<Block, 'lane' | 'lanes'>[] = [];
  for (const t of tasks) {
    if (!isLive(t) || t.dueDate !== day || !t.startTime) continue;
    const start = timeToMinutes(t.startTime);
    const end = t.endTime ? Math.max(start + 15, timeToMinutes(t.endTime)) : start + 30;
    const now = day === today && !t.doneAt && start <= nowMin && nowMin < end;
    raw.push({ id: t.id, title: t.title, start, end, kind: now ? 'now' : 'task', onPress: () => openTask(t.id) });
  }
  for (const e of eventsOn(events, day, hidden)) {
    if (e.allDay || eventDay(e) !== day) continue;
    const start = timeToMinutes(eventStart(e)!);
    const endRaw = timeToMinutes(eventEnd(e)!);
    raw.push({ id: e.id, title: e.title, start, end: Math.max(start + 15, endRaw <= start ? 24 * 60 : endRaw), kind: 'event', onPress: () => openEvent(e.id) });
  }
  return layout(raw);
}

function WeekView({ week, today, tasks, events, hidden, onPickDay }: { week: DateKey[]; today: DateKey; tasks: Task[]; events: GEvent[]; hidden: string[]; onPickDay: (d: DateKey) => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const actions = useTaskActions();
  const scroll = useRef<ScrollViewInstance>(null);
  const nowMin = timeToMinutes(nowTime());
  const colors = { task: [c.cal.taskBg, c.cal.taskText], event: [c.cal.eventBg, c.cal.eventText], now: [c.accent, c.onAccent] } as const;

  return (
    <View style={{ flex: 1, marginTop: 14, marginHorizontal: 12, marginBottom: 104 + insets.bottom, backgroundColor: c.card, borderRadius: 22, paddingTop: 12, paddingRight: 8, paddingLeft: 4, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.cal.hour }}>
        <View style={{ width: 34 }} />
        {week.map((d) => {
          const on = d === today;
          return (
            <PressScale key={d} accessibilityRole="button" accessibilityLabel={`Open ${shortDate(d)}`} onPress={() => onPickDay(d)} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <AppText style={{ ...font(600), fontSize: 12, color: on ? c.accentText : c.textSecondary }}>{weekdayShort(d)[0]}</AppText>
              <View style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.accent : 'transparent' }}>
                <AppText style={{ ...font(800), fontSize: 15, color: on ? c.onAccent : c.text }}>{fromKey(d).getDate()}</AppText>
              </View>
            </PressScale>
          );
        })}
      </View>
      <ScrollView ref={scroll} onLayout={() => scroll.current?.scrollTo({ y: W_HOUR * 7.6, animated: false })} showsVerticalScrollIndicator={false}>
        <View style={{ height: W_HOUR * 24 + 20, marginTop: 10 }}>
          {Array.from({ length: 24 }, (_, h) => (
            <View key={h} aria-hidden style={{ position: 'absolute', top: h * W_HOUR, left: 0, right: 0 }}>
              <View style={{ height: 1, marginLeft: 34, backgroundColor: c.cal.hour }} />
              <AppText tone="secondary" style={{ position: 'absolute', left: 0, width: 31, top: -7, textAlign: 'right', ...font(600), fontSize: 10.5 }}>
                {hourLabel(h, true)}
              </AppText>
            </View>
          ))}
          <View style={{ position: 'absolute', left: 34, right: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
            {week.map((d) => (
              <View key={d} style={{ flex: 1 }}>
                {d === today ? (
                  <View aria-label={`Now, ${nowTime()}`} style={{ position: 'absolute', left: -3, right: 0, top: (nowMin / 60) * W_HOUR, height: 2, backgroundColor: c.cal.nowLine }}>
                    <PulseDot color={c.cal.nowLine} style={{ position: 'absolute', left: -3, top: -3 }} />
                  </View>
                ) : null}
                {timedBlocks(d, today, tasks, events, hidden, actions.openDetails, (id) => sheets.open(() => <EventSheet eventId={id} />)).map((b) => (
                  <PressScale
                    key={b.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.title}, ${minutesToTime(b.start)}`}
                    onPress={b.onPress}
                    style={{
                      position: 'absolute',
                      top: (b.start / 60) * W_HOUR,
                      height: Math.max(20, ((b.end - b.start) / 60) * W_HOUR - 2),
                      left: `${(b.lane / b.lanes) * 100}%`,
                      width: `${100 / b.lanes}%`,
                      paddingHorizontal: 1,
                    }}
                  >
                    <View style={{ flex: 1, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 5, overflow: 'hidden', backgroundColor: colors[b.kind][0] }}>
                      <AppText numberOfLines={3} style={{ ...font(700), fontSize: 10.5, lineHeight: 13, color: colors[b.kind][1] }}>
                        {b.title}
                      </AppText>
                    </View>
                  </PressScale>
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Day ─────────────────────────────────────────────────────────────────────

const D_HOUR = 64;

function DayView({ day, today, tasks, lists, events, hidden }: { day: DateKey; today: DateKey; tasks: Task[]; lists: List[]; events: GEvent[]; hidden: string[] }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const snack = useSnackbar();
  const actions = useTaskActions();
  const updateTask = useStore((s) => s.updateTask);
  const scroll = useRef<ScrollViewInstance>(null);
  const grid = useRef<ViewInstance>(null);
  const scrollY = useRef(0);
  const nowMin = timeToMinutes(nowTime());
  const anytime = tasks.filter((t) => isLive(t) && !t.doneAt && t.dueDate === day && !t.startTime);
  const blocks = timedBlocks(day, today, tasks, events, hidden, actions.openDetails, (id) => sheets.open(() => <EventSheet eventId={id} />));
  const colors = { task: [c.cal.taskBg, c.cal.taskText], event: [c.cal.eventBg, c.cal.eventText], now: [c.accent, c.onAccent] } as const;
  const [drag, setDrag] = useState<{ title: string } | null>(null);
  const [ghost] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));

  // Hold an Anytime chip, drag it onto the grid: it gets that time (snapped to 15 min).
  const drop = (taskId: string, pageY: number) => {
    grid.current?.measureInWindow((_x, top, _w, height) => {
      if (pageY < top || pageY > top + height) return;
      const min = Math.round((((pageY - top + scrollY.current) / D_HOUR) * 60) / 15) * 15;
      const start = minutesToTime(Math.max(0, Math.min(23 * 60 + 45, min)));
      updateTask(taskId, { startTime: start, endTime: null, dueDate: day });
      snack({ title: `Scheduled for ${timeRange(start, null)}`, actions: [{ label: 'Undo', onPress: () => updateTask(taskId, { startTime: null, endTime: null }) }] });
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {anytime.length ? (
        <View style={{ paddingTop: 14, paddingHorizontal: size.sideMargin }}>
          <AppText tone="secondary" style={{ ...font(700), fontSize: 13, marginBottom: 8 }}>{`Anytime · ${anytime.length} · hold and drag onto a time`}</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} scrollEnabled={!drag}>
            {anytime.map((t) => (
              <AnytimeChip
                key={t.id}
                task={t}
                ringColor={c.priority[(['none', 'low', 'medium', 'high'] as const)[t.priority]]}
                onTap={() => actions.openDetails(t.id)}
                onDragStart={(x, y) => {
                  ghost.setValue({ x, y });
                  setDrag({ title: t.title });
                }}
                onDragMove={(x, y) => ghost.setValue({ x, y })}
                onDrop={(y) => {
                  setDrag(null);
                  drop(t.id, y);
                }}
                onCancel={() => setDrag(null)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
      <View style={{ flex: 1, marginTop: 14, marginHorizontal: 12, marginBottom: 104 + insets.bottom, backgroundColor: c.card, borderRadius: 22, paddingTop: 16, overflow: 'hidden' }}>
        <ScrollView
          ref={scroll}
          scrollEnabled={!drag}
          scrollEventThrottle={16}
          onScroll={(e) => (scrollY.current = e.nativeEvent.contentOffset.y)}
          onLayout={() => scroll.current?.scrollTo({ y: D_HOUR * (day === today ? Math.max(0, nowMin / 60 - 1.5) : 8.5), animated: false })}
          showsVerticalScrollIndicator={false}
        >
          <View ref={grid} collapsable={false} style={{ height: D_HOUR * 24 + 20 }}>
            {Array.from({ length: 24 }, (_, h) => (
              <View key={h} aria-hidden style={{ position: 'absolute', top: h * D_HOUR, left: 0, right: 0 }}>
                <View style={{ height: 1, marginLeft: 44, backgroundColor: c.cal.hour }} />
                <AppText tone="secondary" style={{ position: 'absolute', left: 0, width: 36, top: -8, textAlign: 'right', ...font(600), fontSize: 12 }}>
                  {hourLabel(h)}
                </AppText>
              </View>
            ))}
            {day === today ? (
              <View aria-label={`Now, ${nowTime()}`} style={{ position: 'absolute', left: 44, right: 0, top: (nowMin / 60) * D_HOUR, height: 2, backgroundColor: c.cal.nowLine }}>
                <PulseDot color={c.cal.nowLine} style={{ position: 'absolute', left: -4, top: -3 }} />
              </View>
            ) : null}
            <View style={{ position: 'absolute', left: 52, right: 8, top: 0, bottom: 0 }}>
              {blocks.map((b) => {
                const [bg, fg] = colors[b.kind];
                const h = Math.max(30, ((b.end - b.start) / 60) * D_HOUR - 2);
                const task = tasks.find((t) => t.id === b.id);
                const tall = h >= 56;
                const list = task ? lists.find((l) => l.id === task.listId)?.name : 'Google Calendar';
                const range = timeRange(minutesToTime(b.start), task?.endTime ?? (task ? null : minutesToTime(b.end % (24 * 60))));
                return (
                  <View key={b.id} style={{ position: 'absolute', top: (b.start / 60) * D_HOUR + 1, height: h, left: `${(b.lane / b.lanes) * 100}%`, width: `${100 / b.lanes}%`, paddingHorizontal: 1 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingVertical: 6, paddingLeft: 12, paddingRight: 6, backgroundColor: bg, opacity: task?.doneAt ? 0.6 : 1 }}>
                      <PressScale accessibilityRole="button" accessibilityLabel={`${b.title}, ${range}`} onPress={b.onPress} style={{ flex: 1, justifyContent: 'center', alignSelf: 'stretch' }}>
                        <AppText numberOfLines={tall ? 2 : 1} style={{ ...font(700), fontSize: 13.5, lineHeight: 17, color: fg, textDecorationLine: task?.doneAt ? 'line-through' : 'none' }}>
                          {tall ? b.title : `${b.title} · ${timeRange(minutesToTime(b.start), null)}`}
                        </AppText>
                        {tall ? <AppText style={{ fontSize: 12, marginTop: 2, color: b.kind === 'now' ? c.onAccentSecondary : fg }}>{[range, list].filter(Boolean).join(' · ')}</AppText> : null}
                      </PressScale>
                      <PressScale
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: !!task?.doneAt }}
                        accessibilityLabel={task ? (task.doneAt ? `Mark not done: ${task.title}` : `Mark done: ${task.title}`) : `Hide ${b.title} from your list`}
                        hitSlop={8}
                        onPress={() => {
                          if (task) actions.toggle(task.id);
                          else {
                            void setEventHidden(b.id, true);
                            snack({ title: 'Hidden from your list', sub: 'Still in Google Calendar', actions: [{ label: 'Undo', onPress: () => void setEventHidden(b.id, false) }] });
                          }
                        }}
                        style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: fg, opacity: 0.7, backgroundColor: task?.doneAt ? fg : 'transparent' }} />
                      </PressScale>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
      {drag ? (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateX: Animated.add(ghost.x, -60) }, { translateY: Animated.add(ghost.y, -22) }] }}
        >
          <View style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.accent, justifyContent: 'center', opacity: 0.92 }}>
            <AppText style={{ ...font(700), fontSize: 13.5, color: c.onAccent }}>{drag.title}</AppText>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** An Anytime chip: tap opens the task; hold for 300 ms, then drag onto the day grid. */
function AnytimeChip({
  task,
  ringColor,
  onTap,
  onDragStart,
  onDragMove,
  onDrop,
  onCancel,
}: {
  task: Task;
  ringColor: string;
  onTap: () => void;
  onDragStart: (x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDrop: (pageY: number) => void;
  onCancel: () => void;
}) {
  const { c } = useTheme();
  const cb = useRef({ onTap, onDragStart, onDragMove, onDrop, onCancel });
  useEffect(() => {
    cb.current = { onTap, onDragStart, onDragMove, onDrop, onCancel };
  });
  // The ref is only read inside gesture handlers, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => makeHoldDrag(() => cb.current));
  return (
    <View
      {...pan.panHandlers}
      accessible
      accessibilityRole="button"
      accessibilityLabel={task.title}
      accessibilityHint="Opens the task. Hold and drag onto a time to schedule it."
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingLeft: 12, paddingRight: 8, borderRadius: 12, backgroundColor: c.card, maxWidth: 220, userSelect: 'none' } as object}
    >
      <AppText numberOfLines={1} style={{ flexShrink: 1, ...font(700), fontSize: 13.5 }}>
        {task.title}
      </AppText>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: ringColor }} />
    </View>
  );
}

type HoldDragCallbacks = { onTap: () => void; onDragStart: (x: number, y: number) => void; onDragMove: (x: number, y: number) => void; onDrop: (y: number) => void; onCancel: () => void };

function makeHoldDrag(latest: () => HoldDragCallbacks) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let armed = false;
  let moved = false;
  let last = { x: 0, y: 0 };
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => armed,
    onPanResponderTerminationRequest: () => !armed,
    onPanResponderGrant: (e) => {
      armed = false;
      moved = false;
      last = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      timer = setTimeout(() => {
        armed = true;
        latest().onDragStart(last.x, last.y);
      }, 300);
    },
    onPanResponderMove: (e, g) => {
      last = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      if (armed) latest().onDragMove(last.x, last.y);
      else if (Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8) {
        moved = true;
        clear();
      }
    },
    onPanResponderRelease: (e) => {
      clear();
      if (armed) latest().onDrop(e.nativeEvent.pageY);
      else if (!moved) latest().onTap();
      armed = false;
    },
    onPanResponderTerminate: () => {
      clear();
      if (armed) latest().onCancel();
      armed = false;
    },
  });
}
