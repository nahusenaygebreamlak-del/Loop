import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance, type ViewInstance } from 'react-native';
import { AppText } from '@/components/AppText';
import { Check } from '@/components/Check';
import { Icon } from '@/components/Icon';
import { PulseDot } from '@/components/Motion';
import { useSnackbar } from '@/components/Snackbar';
import { connectGoogleCalendar, refreshEvents, useCalendar } from '@/calendar/google';
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
  timeRange,
  timeToMinutes,
  weekdayLong,
  weekdayShort,
  weekOf,
  type DateKey,
} from '@/lib/dates';
import { eventDay, eventEnd, eventsOn, eventStart, type GEvent } from '@/lib/events';
import { isLive, isOpen, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import type { List, Task } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { useContextMenu, useDraggable, useDropTarget } from '../dom';
import { useOpenTaskMenu } from '../Menu';
import { openQuickAdd, selectTask, useDeskState } from '../state';
import { DetailPanel } from '../Panels';
import { Banner } from '../ui';

type CalView = 'month' | 'week' | 'day';
type Block = { id: string; title: string; start: number; end: number; kind: 'task' | 'event' | 'now'; lane: number; lanes: number; task?: Task; e?: GEvent };

/** Side-by-side lanes for overlapping blocks. */
function layout(raw: Omit<Block, 'lane' | 'lanes'>[]): Block[] {
  const sorted = [...raw].sort((a, b) => a.start - b.start || b.end - a.end);
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

function blocksFor(day: DateKey, today: DateKey, tasks: Task[], events: GEvent[]): Block[] {
  const nowMin = timeToMinutes(nowTime());
  const raw: Omit<Block, 'lane' | 'lanes'>[] = [];
  for (const t of tasks) {
    if (!isLive(t) || t.dueDate !== day || !t.startTime) continue;
    const start = timeToMinutes(t.startTime);
    const end = t.endTime ? Math.max(start + 15, timeToMinutes(t.endTime)) : start + 30;
    const now = day === today && !t.doneAt && start <= nowMin && nowMin < end;
    raw.push({ id: t.id, title: t.title, start, end, kind: now ? 'now' : 'task', task: t });
  }
  for (const e of events) {
    if (e.allDay || eventDay(e) !== day) continue;
    const start = timeToMinutes(eventStart(e)!);
    const endRaw = timeToMinutes(eventEnd(e)!);
    raw.push({ id: e.id, title: e.title, start, end: Math.max(start + 15, endRaw <= start ? 24 * 60 : endRaw), kind: 'event', e });
  }
  return layout(raw);
}

const snap = (min: number) => Math.max(0, Math.min(23 * 60 + 45, Math.round(min / 15) * 15));

/** WCalWeek / WCalMonth / WCalDay, with the "Not scheduled" column and WGoogleFailed. */
export function CalendarDesk() {
  const { c } = useTheme();
  const { today } = useToday();
  const weekStart = useSettings((s) => s.weekStart);
  const allTasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const cal = useCalendar();
  const selected = useDeskState((s) => s.selected);
  const [view, setView] = useState<CalView>('week');
  const [day, setDay] = useState<DateKey>(today);
  const [month, setMonth] = useState(() => ({ y: fromKey(today).getFullYear(), m: fromKey(today).getMonth() }));
  const tasks = visibleTasks(allTasks, lists);
  const connected = cal.status === 'connected' || cal.status === 'failed';
  const events = connected ? cal.events.filter((e) => !cal.hidden.includes(e.id)) : [];
  const stale = cal.status === 'failed';
  useEffect(() => {
    void refreshEvents();
  }, []);

  const pick = (d: DateKey) => {
    setDay(d);
    setMonth({ y: fromKey(d).getFullYear(), m: fromKey(d).getMonth() });
  };
  const step = (n: number) => {
    if (view === 'month') {
      const d = new Date(month.y, month.m + n, 1);
      setMonth({ y: d.getFullYear(), m: d.getMonth() });
    } else pick(addDays(day, view === 'week' ? 7 * n : n));
  };
  const week = weekOf(day, weekStart);
  const title =
    view === 'month' ? (
      <>
        {monthName(month.m)}
        <AppText style={{ ...font(700), fontSize: 26, color: c.textSecondary }}>{` ${month.y}`}</AppText>
      </>
    ) : view === 'week' ? (
      fromKey(week[0]).getMonth() === fromKey(week[6]).getMonth() ? `${monthDay(week[0])} – ${fromKey(week[6]).getDate()}` : `${monthDay(week[0])} – ${monthDay(week[6])}`
    ) : (
      `${weekdayLong(day)}, ${monthDay(day)}`
    );

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.ground }}>
      <View style={{ flex: 1, minWidth: 0, paddingTop: 30, paddingLeft: 36, paddingRight: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
          <View style={{ flex: 1 }}>
            {view === 'day' ? <AppText style={{ fontSize: 14.5, color: c.textSecondary }}>{relativeDay(day, today).includes(',') ? '' : relativeDay(day, today)}</AppText> : null}
            <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 34, lineHeight: 40, letterSpacing: -0.68 }}>
              {title}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <NavBtn label="‹" a11y={`Previous ${view}`} onPress={() => step(-1)} />
            <NavBtn label="Today" accent onPress={() => pick(today)} />
            <NavBtn label="›" a11y={`Next ${view}`} onPress={() => step(1)} />
          </View>
          <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: c.cal.segBg }}>
            {(['month', 'week', 'day'] as const).map((v) => {
              const on = v === view;
              return (
                <Pressable key={v} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setView(v)} style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: 11, backgroundColor: on ? c.card : 'transparent', justifyContent: 'center' }}>
                  <AppText style={{ ...font(on ? 700 : 600), fontSize: 14, color: on ? c.text : c.textSecondary }}>{v[0].toUpperCase() + v.slice(1)}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
        {stale ? (
          <Banner
            icon="alert"
            iconBg={c.dangerTint}
            iconFg={c.dangerText}
            title="Can't reach Google Calendar"
            text="Showing the last events Loop saw. Your Loop tasks are up to date."
            right={
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable accessibilityRole="button" onPress={() => void refreshEvents()} style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.ground, justifyContent: 'center' }}>
                  <AppText style={{ ...font(700), fontSize: 13.5 }}>Try again</AppText>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => void connectGoogleCalendar().catch(() => {})} style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.ground, justifyContent: 'center' }}>
                  <AppText style={{ ...font(700), fontSize: 13.5 }}>Reconnect</AppText>
                </Pressable>
              </View>
            }
          />
        ) : null}
        <View style={{ flex: 1, marginTop: stale ? 16 : 18, backgroundColor: c.card, borderRadius: 22, overflow: 'hidden', opacity: 1 }}>
          {view === 'month' ? (
            <MonthGrid month={month} day={day} today={today} weekStart={weekStart} tasks={tasks} events={events} stale={stale} onPick={pick} />
          ) : (
            <TimeGrid days={view === 'week' ? week : [day]} today={today} tasks={tasks} events={events} lists={lists} hour={view === 'week' ? 56 : 72} wide={view === 'day'} stale={stale} onPickDay={(d) => (pick(d), setView('day'))} />
          )}
        </View>
      </View>
      <View style={{ width: 300, marginTop: 16, marginRight: 16, marginBottom: 16, backgroundColor: c.card, borderRadius: 24, paddingTop: 26, paddingHorizontal: 22, paddingBottom: 22 }}>
        {selected ? (
          <DetailPanel />
        ) : view === 'month' ? (
          <DayAgenda day={day} today={today} tasks={tasks} events={events} lists={lists} />
        ) : (
          <Unscheduled view={view} days={view === 'week' ? week : [day]} today={today} tasks={tasks} />
        )}
      </View>
    </View>
  );
}

function NavBtn({ label, a11y, accent, onPress }: { label: string; a11y?: string; accent?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y ?? label} onPress={onPress} style={{ minWidth: 38, minHeight: 38, paddingHorizontal: accent ? 14 : 0, borderRadius: 12, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
      <AppText style={{ ...font(700), fontSize: accent ? 14 : 16, color: accent ? c.accentText : c.text }}>{label}</AppText>
    </Pressable>
  );
}

// ─── Week / Day grid ─────────────────────────────────────────────────────────

function TimeGrid({ days, today, tasks, events, lists, hour, wide, stale, onPickDay }: { days: DateKey[]; today: DateKey; tasks: Task[]; events: GEvent[]; lists: List[]; hour: number; wide: boolean; stale: boolean; onPickDay: (d: DateKey) => void }) {
  const { c } = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  const label = wide ? 60 : 52;
  const hourText = (h: number) => (wide ? formatTime(`${String(h).padStart(2, '0')}:00`) : formatTime(`${String(h).padStart(2, '0')}:00`).replace(':00', '').replace(/^(\d)$/, '0$1'));
  return (
    <View style={{ flex: 1 }}>
      {wide ? null : (
        <View style={{ flexDirection: 'row', paddingTop: 12, paddingBottom: 10, paddingRight: 12, borderBottomWidth: 1, borderBottomColor: c.desk.hour }}>
          <View style={{ width: label }} />
          {days.map((d) => {
            const on = d === today;
            return (
              <Pressable key={d} accessibilityRole="button" accessibilityLabel={`Open ${weekdayLong(d)}`} onPress={() => onPickDay(d)} style={{ flex: 1, alignItems: 'center' }}>
                <AppText style={{ ...font(on ? 700 : 600), fontSize: 12, color: on ? c.accentText : c.textSecondary }}>{weekdayShort(d)}</AppText>
                <View style={{ minWidth: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.accent : 'transparent' }}>
                  <AppText style={{ ...font(800), fontSize: 18, color: on ? c.onAccent : c.text }}>{fromKey(d).getDate()}</AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      <ScrollView ref={scroll} onLayout={() => scroll.current?.scrollTo({ y: hour * 7.8, animated: false })} contentContainerStyle={{ paddingTop: 12, paddingRight: 12 }}>
        <View style={{ height: hour * 24 + 16, flexDirection: 'row' }}>
          <View style={{ width: label }}>
            {Array.from({ length: 24 }, (_, h) => (
              <AppText key={h} tone="secondary" style={{ position: 'absolute', top: h * hour - 7, right: 10, ...font(600), fontSize: 11.5 }}>
                {hourText(h)}
              </AppText>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            {Array.from({ length: 24 }, (_, h) => (
              <View key={h} aria-hidden style={{ position: 'absolute', top: h * hour, left: 0, right: 0, height: 1, backgroundColor: c.desk.hour }} />
            ))}
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
              {days.map((d) => (
                <DayColumn key={d} day={d} today={today} tasks={tasks} events={events} lists={lists} hour={hour} wide={wide} stale={stale} />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function DayColumn({ day, today, tasks, events, lists, hour, wide, stale }: { day: DateKey; today: DateKey; tasks: Task[]; events: GEvent[]; lists: List[]; hour: number; wide: boolean; stale: boolean }) {
  const { c } = useTheme();
  const snack = useSnackbar();
  const updateTask = useStore((s) => s.updateTask);
  const [hoverMin, setHoverMin] = useState<number | null>(null);
  const blocks = useMemo(() => blocksFor(day, today, tasks, events), [day, today, tasks, events]);
  const [dropRef, over] = useDropTarget<ViewInstance>((p, e) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const at = minutesToTime(snap(((e.clientY - rect.top) / hour) * 60));
    const t = useStore.getState().tasks.find((x) => x.id === p.id);
    if (!t) return;
    const before = { dueDate: t.dueDate, startTime: t.startTime, endTime: t.endTime };
    const len = t.startTime && t.endTime ? timeToMinutes(t.endTime) - timeToMinutes(t.startTime) : null;
    updateTask(p.id, { dueDate: day, startTime: at, endTime: len ? minutesToTime(Math.min(23 * 60 + 59, timeToMinutes(at) + len)) : null });
    setHoverMin(null);
    snack({ title: `Scheduled for ${relativeDay(day, today).includes(',') ? weekdayLong(day) : relativeDay(day, today).toLowerCase()}, ${formatTime(at)}`, actions: [{ label: 'Undo', onPress: () => updateTask(p.id, before) }] });
  });
  // Show where the drop will land.
  useEffect(() => {
    const node = dropRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;
    const move = (e: DragEvent) => {
      const rect = node.getBoundingClientRect();
      setHoverMin(snap(((e.clientY - rect.top) / hour) * 60));
    };
    const leave = () => setHoverMin(null);
    node.addEventListener('dragover', move);
    node.addEventListener('dragleave', leave);
    node.addEventListener('drop', leave);
    return () => {
      node.removeEventListener('dragover', move);
      node.removeEventListener('dragleave', leave);
      node.removeEventListener('drop', leave);
    };
  }, [dropRef, hour]);
  const nowMin = timeToMinutes(nowTime());
  const colors = { task: [c.cal.taskBg, c.cal.taskText], event: [c.cal.eventBg, c.cal.eventText], now: [c.accent, c.onAccent] } as const;
  return (
    <View ref={dropRef} style={{ flex: 1, borderLeftWidth: wide ? 0 : 1, borderLeftColor: c.desk.hour }}>
      {day === today ? (
        <View aria-label={`Now, ${formatTime(nowTime())}`} style={{ position: 'absolute', left: -3, right: 0, top: (nowMin / 60) * hour, height: 2, backgroundColor: c.cal.nowLine, zIndex: 3 }}>
          <PulseDot color={c.cal.nowLine} style={{ position: 'absolute', left: -3, top: -3 }} />
        </View>
      ) : null}
      {blocks.map((b) => (
        <GridBlock key={b.id} b={b} hour={hour} wide={wide} colors={colors[b.kind]} stale={stale && b.kind === 'event'} listName={b.task ? lists.find((l) => l.id === b.task!.listId)?.name : undefined} />
      ))}
      {over && hoverMin != null ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: (hoverMin / 60) * hour, left: 3, right: 3, height: Math.max(30, hour * 0.9), borderRadius: 10, borderWidth: 2, borderColor: c.accent, backgroundColor: c.card, paddingHorizontal: 10, justifyContent: 'center', zIndex: 4 }}>
          <AppText style={{ ...font(700), fontSize: 12.5, color: c.accentText }}>{`drop at ${formatTime(minutesToTime(hoverMin))}`}</AppText>
        </View>
      ) : null}
    </View>
  );
}

function GridBlock({ b, hour, wide, colors, stale, listName }: { b: Block; hour: number; wide: boolean; colors: readonly [string, string]; stale: boolean; listName?: string }) {
  const { c } = useTheme();
  const actions = useTaskActions();
  const openMenu = useOpenTaskMenu();
  const dragRef = useDraggable<ViewInstance>(b.task ? { kind: 'task', id: b.task.id } : null);
  const menuRef = useContextMenu<ViewInstance>((x, y) => b.task && openMenu(b.task.id, x, y));
  const [bg, fg] = colors;
  const h = Math.max(22, ((b.end - b.start) / 60) * hour - 3);
  const tall = h >= (wide ? 56 : 40);
  const range = timeRange(minutesToTime(b.start), b.task ? b.task.endTime : minutesToTime(b.end % (24 * 60)));
  return (
    <View ref={dragRef} style={{ position: 'absolute', top: (b.start / 60) * hour + 1, height: h, left: `${(b.lane / b.lanes) * 100}%`, width: `${100 / b.lanes}%`, paddingHorizontal: 3, opacity: stale ? 0.6 : 1 }}>
      <View ref={menuRef} style={{ flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${b.title}, ${range}`}
          onPress={() => (b.task ? selectTask(b.task.id) : useDeskState.setState({ selected: { kind: 'event', id: b.id } }))}
          style={{ flex: 1, flexDirection: 'row', alignItems: wide && !tall ? 'center' : 'flex-start', gap: 8, borderRadius: wide ? 14 : 10, paddingVertical: wide ? 8 : 5, paddingHorizontal: wide ? 16 : 8, backgroundColor: bg, overflow: 'hidden', cursor: 'pointer' } as object}
        >
          <View style={{ flex: 1 }}>
            <AppText numberOfLines={tall ? 2 : 1} style={{ ...font(700), fontSize: wide ? 15 : 12.5, lineHeight: wide ? 20 : 16, color: fg }}>
              {wide && !tall ? `${b.title} · ${range}` : b.title}
            </AppText>
            {tall ? (
              <AppText numberOfLines={1} style={{ fontSize: wide ? 13 : 11.5, color: b.kind === 'now' ? c.onAccentSecondary : fg, marginTop: 1 }}>
                {wide ? [range, b.task ? listName : null, b.task?.subtasks.length ? `${b.task.subtasks.filter((s) => s.doneAt).length} of ${b.task.subtasks.length} subtasks` : null].filter(Boolean).join(' · ') : formatTime(minutesToTime(b.start))}
              </AppText>
            ) : null}
          </View>
          {wide && b.task ? <Check done={!!b.task.doneAt} priority={b.task.priority} onAccent={b.kind === 'now'} label={b.task.title} onToggle={() => actions.toggle(b.task!.id)} /> : null}
          {wide && b.e ? (
            <AppText style={{ fontSize: 12.5, color: fg }}>Google</AppText>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Month ───────────────────────────────────────────────────────────────────

function MonthGrid({ month, day, today, weekStart, tasks, events, stale, onPick }: { month: { y: number; m: number }; day: DateKey; today: DateKey; weekStart: number; tasks: Task[]; events: GEvent[]; stale: boolean; onPick: (d: DateKey) => void }) {
  const { c } = useTheme();
  const cells = monthGrid(month.y, month.m, weekStart);
  const rows: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return (
    <View style={{ flex: 1, padding: 12 }}>
      <View style={{ flexDirection: 'row', paddingBottom: 6 }}>
        {weekOf(today, weekStart).map((d) => (
          <AppText key={d} tone="secondary" style={{ flex: 1, ...font(600), fontSize: 12.5, paddingLeft: 6 }}>
            {weekdayShort(d)}
          </AppText>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={{ flex: 1, flexDirection: 'row' }}>
          {r.map((cell) => {
            const items = [
              ...tasks.filter((t) => isOpen(t) && t.dueDate === cell.key).map((t) => ({ id: t.id, title: t.title, ev: false, now: false })),
              ...eventsOn(events, cell.key).map((e) => ({ id: e.id, title: e.title, ev: true, now: false })),
            ];
            const sel = cell.key === day;
            return (
              <Pressable
                key={cell.key}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={`${weekdayLong(cell.key)} ${fromKey(cell.key).getDate()}${items.length ? `, ${items.length} items` : ''}`}
                onPress={() => onPick(cell.key)}
                style={{ flex: 1, minHeight: 80, padding: 6, borderRadius: 12, backgroundColor: sel ? c.ground : 'transparent', gap: 3 }}
              >
                <AppText style={{ ...font(cell.key === today ? 800 : 700), fontSize: 13, color: !cell.inMonth ? c.line : cell.key === today ? c.accentText : c.text }}>{fromKey(cell.key).getDate()}</AppText>
                {items.slice(0, 3).map((it) => (
                  <View key={it.id} style={{ borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6, backgroundColor: it.ev ? c.cal.eventBg : c.cal.taskBg, opacity: it.ev && stale ? 0.6 : 1 }}>
                    <AppText numberOfLines={1} style={{ ...font(700), fontSize: 11.5, color: it.ev ? c.cal.eventText : c.cal.taskText }}>
                      {it.title}
                    </AppText>
                  </View>
                ))}
                {items.length > 3 ? (
                  <AppText tone="secondary" style={{ ...font(600), fontSize: 11.5, paddingLeft: 2 }}>{`+${items.length - 3} more`}</AppText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Month's right column: the picked day's items and "+ Add to Oct 16". */
function DayAgenda({ day, today, tasks, events, lists }: { day: DateKey; today: DateKey; tasks: Task[]; events: GEvent[]; lists: List[] }) {
  const { c } = useTheme();
  const nowMin = timeToMinutes(nowTime());
  const items = [
    ...tasks.filter((t) => isLive(t) && t.dueDate === day).map((t) => ({ at: t.startTime ?? '99', t, e: null as GEvent | null })),
    ...eventsOn(events, day).map((e) => ({ at: eventStart(e) ?? '00', t: null as Task | null, e })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <ScrollView contentContainerStyle={{ gap: 8 }}>
      <AppText tone="secondary" style={{ fontSize: 13.5 }}>
        {weekdayLong(day)}
      </AppText>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 24, marginBottom: 6 }}>
        {`${monthName(fromKey(day).getMonth())} ${fromKey(day).getDate()}`}
      </AppText>
      {items.map((x) => {
        if (x.e) {
          return (
            <Pressable key={x.e.id} accessibilityRole="button" onPress={() => useDeskState.setState({ selected: { kind: 'event', id: x.e!.id } })} style={{ borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: c.cal.eventBg }}>
              <AppText style={{ ...font(700), fontSize: 15 }}>{x.e.title}</AppText>
              <AppText tone="secondary" style={{ fontSize: 13, marginTop: 2 }}>{`${x.e.allDay ? 'All day' : timeRange(eventStart(x.e), eventEnd(x.e))} · Google`}</AppText>
            </Pressable>
          );
        }
        const t = x.t!;
        const now = day === today && !t.doneAt && t.startTime && timeToMinutes(t.startTime) <= nowMin && nowMin < (t.endTime ? timeToMinutes(t.endTime) : timeToMinutes(t.startTime) + 60);
        return (
          <Pressable key={t.id} accessibilityRole="button" onPress={() => selectTask(t.id)} style={{ borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: now ? c.accent : c.ground }}>
            <AppText style={{ ...font(700), fontSize: 15, color: now ? c.onAccent : t.doneAt ? c.textSecondary : c.text, textDecorationLine: t.doneAt ? 'line-through' : 'none' }}>{t.title}</AppText>
            <AppText style={{ fontSize: 13, marginTop: 2, color: now ? c.onAccentSecondary : c.textSecondary }}>
              {[t.startTime ? timeRange(t.startTime, t.endTime) : 'Anytime', lists.find((l) => l.id === t.listId)?.name].filter(Boolean).join(' · ')}
            </AppText>
          </Pressable>
        );
      })}
      <Pressable accessibilityRole="button" onPress={() => openQuickAdd({ date: day })} style={{ minHeight: 52, borderRadius: 16, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}>
        <AppText style={{ ...font(700), fontSize: 15, color: c.accentText }}>{`+ Add to ${monthDay(day)}`}</AppText>
      </Pressable>
    </ScrollView>
  );
}

/** "Not scheduled" (week) / "Anytime today" (day): untimed tasks to drag onto a time, plus overdue. */
function Unscheduled({ view, days, today, tasks }: { view: CalView; days: DateKey[]; today: DateKey; tasks: Task[] }) {
  const { c } = useTheme();
  const anytime = tasks.filter((t) => isOpen(t) && t.dueDate && days.includes(t.dueDate) && !t.startTime);
  const overdue = tasks.filter((t) => isOpen(t) && t.dueDate && t.dueDate < today);
  const day = view === 'day';
  return (
    <View style={{ flex: 1, gap: 12 }}>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 17 }}>
        {day ? (days[0] === today ? 'Anytime today' : `Anytime ${weekdayLong(days[0])}`) : 'Not scheduled'}
      </AppText>
      <AppText tone="secondary" style={{ fontSize: 13, lineHeight: 19 }}>
        {day ? 'Drag onto the day to give a task a time.' : 'Drag a task onto the week to give it a time.'}
      </AppText>
      {!day ? <AppText style={{ ...font(700), fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', color: c.textSecondary, marginTop: 6 }}>{`Anytime this week · ${anytime.length}`}</AppText> : null}
      {anytime.length === 0 ? (
        <AppText tone="secondary" style={{ fontSize: 13.5 }}>
          Nothing without a time.
        </AppText>
      ) : null}
      {anytime.map((t) => (
        <DragChip key={t.id} task={t} right={day ? undefined : weekdayShort(t.dueDate!)} />
      ))}
      {overdue.length ? (
        <>
          <AppText style={{ ...font(700), fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', color: c.dangerText, marginTop: 10 }}>{`Overdue · ${overdue.length}`}</AppText>
          {overdue.map((t) => (
            <DragChip key={t.id} task={t} late right={day ? undefined : weekdayShort(t.dueDate!)} />
          ))}
        </>
      ) : null}
      <View style={{ flex: 1 }} />
      {!day ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[
            ['Tasks', c.cal.taskBg],
            ['Google events', c.cal.eventBg],
          ].map(([l, col]) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: col }} />
              <AppText tone="secondary" style={{ ...font(600), fontSize: 12.5 }}>
                {l}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DragChip({ task, late, right }: { task: Task; late?: boolean; right?: string }) {
  const { c } = useTheme();
  const dragRef = useDraggable<ViewInstance>({ kind: 'task', id: task.id });
  const openMenu = useOpenTaskMenu();
  const menuRef = useContextMenu<ViewInstance>((x, y) => openMenu(task.id, x, y));
  const ring = c.priority[(['none', 'low', 'medium', 'high'] as const)[task.priority]];
  return (
    <View ref={dragRef}>
      <View ref={menuRef}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Drag onto a time to schedule it"
          onPress={() => selectTask(task.id)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 12, borderRadius: 14, backgroundColor: late ? c.dangerTint : c.ground, cursor: 'grab' } as object}
        >
          <Icon name="drag" size={16} color={late ? c.dangerText : c.line} />
          <AppText numberOfLines={1} style={{ flex: 1, ...font(700), fontSize: 14 }}>
            {task.title}
          </AppText>
          {right ? <AppText style={{ ...font(600), fontSize: 12, color: late ? c.dangerText : c.textSecondary }}>{right}</AppText> : <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: ring }} />}
        </Pressable>
      </View>
    </View>
  );
}
