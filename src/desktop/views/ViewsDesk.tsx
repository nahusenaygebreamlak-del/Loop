import { useState } from 'react';
import { Pressable, View, type ViewInstance } from 'react-native';
import { AppText } from '@/components/AppText';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { useCalendar } from '@/calendar/google';
import { goMain } from '@/features/nav';
import { TagMenuSheet } from '@/features/sheets/TagMenuSheet';
import { addDays, monthDay, relativeDay, shortDate, timeRange, weekdayLong, type DateKey } from '@/lib/dates';
import { eventEnd, eventsOn, eventStart } from '@/lib/events';
import { shortRuleLabel } from '@/lib/repeat';
import { allTasksGroups, dueShort, isOpen, next7View, tagGroups, visibleTasks, type AllMode } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import type { List, Task } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { DeskConfirm } from '../Dialog';
import { useDropTarget } from '../dom';
import { MenuCard, MenuItem } from '../Menu';
import { openQuickAdd, useDeskState } from '../state';
import { DeskCard, DeskEmpty, DeskHeader, DeskPage, GroupLab, KeyButton, SoftButton, TaskRowDesk, useRows } from '../ui';

// ─── Next 7 Days ─────────────────────────────────────────────────────────────

/** WNext7: seven day cards in two columns; drop a task on a day to move it there. */
export function Next7Desk() {
  const { c } = useTheme();
  const { today } = useToday();
  const allTasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const cal = useCalendar();
  const tasks = visibleTasks(allTasks, lists);
  const days = next7View(tasks, today);
  useRows(days.flatMap((d) => d.tasks.filter((t) => !t.doneAt).map((t) => t.id)));
  const left = days.filter((_, i) => i % 2 === 0);
  const right = days.filter((_, i) => i % 2 === 1);
  const col = (ds: typeof days) => (
    <View style={{ flex: 1, gap: 14 }}>
      {ds.map((d) => (
        <DayCard key={d.key} day={d.key} today={today} tasks={d.tasks} lists={lists} events={cal.status === 'off' ? [] : eventsOn(cal.events, d.key, cal.hidden)} />
      ))}
    </View>
  );
  return (
    <DeskPage>
      <DeskHeader pre={`${shortDate(today)} – ${shortDate(addDays(today, 6))}`} title="Next 7 Days" actions={<KeyButton label="Add task" k="Q" onPress={() => openQuickAdd()} />} />
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 22, alignItems: 'flex-start' }}>
        {col(left)}
        {col(right)}
      </View>
      <AppText style={{ marginTop: 16, fontSize: 12.5, color: c.textSecondary }}>Drag a task onto another day to move it. Grey rows are Google Calendar events.</AppText>
    </DeskPage>
  );
}

function DayCard({ day, today, tasks, lists, events }: { day: DateKey; today: DateKey; tasks: Task[]; lists: List[]; events: ReturnType<typeof eventsOn> }) {
  const { c } = useTheme();
  const snack = useSnackbar();
  const updateTask = useStore((s) => s.updateTask);
  const [dropRef, over] = useDropTarget<ViewInstance>((p) => {
    const t = useStore.getState().tasks.find((x) => x.id === p.id);
    if (!t || t.dueDate === day) return;
    const before = t.dueDate;
    updateTask(p.id, { dueDate: day });
    snack({ title: `Moved to ${relativeDay(day, today).includes(',') ? weekdayLong(day) : relativeDay(day, today).toLowerCase()}`, actions: [{ label: 'Undo', onPress: () => updateTask(p.id, { dueDate: before }) }] });
  });
  const isToday = day === today;
  const label = isToday ? 'Today' : day === addDays(today, 1) ? 'Tomorrow' : weekdayLong(day);
  const count = tasks.length + events.length;
  const rows = [...tasks.map((t) => ({ at: t.startTime ?? '99', t })), ...events.map((e) => ({ at: eventStart(e) ?? '00', e }))].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <View ref={dropRef} style={{ backgroundColor: c.card, borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: over ? c.accent : 'transparent', margin: -2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 14, paddingHorizontal: 18, paddingBottom: 6 }}>
        <AppText style={{ ...font(800), fontSize: 15.5, color: isToday ? c.accentText : c.text }}>{label}</AppText>
        <AppText tone="secondary" style={{ fontSize: 13 }}>
          {`${isToday || label === 'Tomorrow' ? shortDate(day) : monthDay(day)}${count ? ` · ${count}` : ''}`}
        </AppText>
        <View style={{ flex: 1 }} />
        {over ? <AppText style={{ ...font(700), fontSize: 13, color: c.accentText }}>Drop to move here</AppText> : null}
      </View>
      {rows.length === 0 ? (
        <AppText tone="secondary" style={{ fontSize: 14, paddingHorizontal: 18, paddingBottom: 16, paddingTop: 2 }}>
          Nothing planned
        </AppText>
      ) : (
        rows.map((r, i) =>
          'e' in r && r.e ? (
            <Pressable
              key={r.e.id}
              accessibilityRole="button"
              onPress={() => useDeskState.setState({ selected: { kind: 'event', id: r.e!.id } })}
              style={{ minHeight: 56, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 6, backgroundColor: c.desk.eventRow }}
            >
              <AppText style={{ ...font(700), fontSize: 15 }}>{r.e.title}</AppText>
              <AppText tone="secondary" style={{ fontSize: 13, marginTop: 2 }}>{`${r.e.allDay ? 'All day' : timeRange(eventStart(r.e), eventEnd(r.e))} · Google Calendar`}</AppText>
            </Pressable>
          ) : (
            <TaskRowDesk
              key={(r as { t: Task }).t.id}
              task={(r as { t: Task }).t}
              last={i === rows.length - 1}
              sub={
                [
                  (r as { t: Task }).t.startTime ? timeRange((r as { t: Task }).t.startTime, null) : null,
                  lists.find((l) => l.id === (r as { t: Task }).t.listId)?.name,
                  (r as { t: Task }).t.repeatRule ? shortRuleLabel((r as { t: Task }).t.repeatRule).replace(/^Every/, 'repeats') : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
            />
          ),
        )
      )}
    </View>
  );
}

// ─── All tasks ───────────────────────────────────────────────────────────────

type AllFilter = 'all' | 'dated' | 'undated' | 'high' | 'overdue';

/** WAllTasks: grouped by list (or date / priority), filter chips, group and sort menus. */
export function AllDesk() {
  const { c } = useTheme();
  const sheets = useSheets();
  const { today } = useToday();
  const allTasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const tags = useStore((s) => s.tags);
  const [mode, setMode] = useState<AllMode>('list');
  const [sort, setSort] = useState<'date' | 'priority' | 'title'>('date');
  const [filter, setFilter] = useState<AllFilter>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const tasks = visibleTasks(allTasks, lists);
  const pass = (t: Task) =>
    filter === 'all' ||
    (filter === 'dated' && !!t.dueDate) ||
    (filter === 'undated' && !t.dueDate) ||
    (filter === 'high' && t.priority === 3) ||
    (filter === 'overdue' && !!t.dueDate && t.dueDate < today);
  const sorter = (a: Task, b: Task) => (sort === 'title' ? a.title.localeCompare(b.title) : sort === 'priority' ? b.priority - a.priority : 0);
  const groups = allTasksGroups(tasks.filter(pass), lists, mode, today).map((g) => ({ ...g, tasks: sort === 'date' ? g.tasks : [...g.tasks].sort(sorter) }));
  const open = tasks.filter(isOpen);
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today).length;
  const listCount = new Set(open.map((t) => t.listId ?? 'none')).size;
  useRows(groups.filter((g) => !collapsed.has(g.key)).flatMap((g) => g.tasks.map((t) => t.id)));
  const MODE: Record<AllMode, string> = { list: 'List', date: 'Date', priority: 'Priority' };
  const SORT = { date: 'Date', priority: 'Priority', title: 'Title' } as const;

  const dropdown = (label: string, items: [string, () => void][]) => (
    <Pressable
      accessibilityRole="button"
      onPress={(e) => {
        const n = e.nativeEvent as unknown as { pageX: number; pageY: number };
        sheets.open(
          () => (
            <MenuCard label={label} width={200}>
              {items.map(([l, fn]) => (
                <MenuItem key={l} label={l} onPress={fn} />
              ))}
            </MenuCard>
          ),
          'menu',
          { x: n.pageX, y: n.pageY + 16 },
        );
      }}
      style={{ minHeight: 42, paddingHorizontal: 16, borderRadius: 13, backgroundColor: c.card, justifyContent: 'center' }}
    >
      <AppText style={{ ...font(700), fontSize: 14 }}>{`${label} ▾`}</AppText>
    </Pressable>
  );
  const chips: [AllFilter, string][] = [
    ['all', 'All'],
    ['dated', 'Has a date'],
    ['undated', 'No date'],
    ['high', 'High priority'],
    ['overdue', overdue ? `Overdue · ${overdue}` : 'Overdue'],
  ];

  return (
    <DeskPage>
      <DeskHeader
        pre={`${open.length} open task${open.length === 1 ? '' : 's'} in ${listCount} list${listCount === 1 ? '' : 's'}`}
        title="All tasks"
        actions={
          <>
            {dropdown(`Group: ${MODE[mode]}`, (Object.keys(MODE) as AllMode[]).map((m) => [MODE[m], () => setMode(m)]))}
            {dropdown(`Sort: ${SORT[sort]}`, (Object.keys(SORT) as (keyof typeof SORT)[]).map((s) => [SORT[s], () => setSort(s)]))}
            <KeyButton label="Add task" k="Q" onPress={() => openQuickAdd()} />
          </>
        }
      />
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 18 }}>
        {chips.map(([k, l]) => {
          const on = k === filter;
          return (
            <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setFilter(k)} style={{ minHeight: 34, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', backgroundColor: on ? c.accent : c.card }}>
              <AppText style={{ ...font(700), fontSize: 14, color: on ? c.onAccent : c.text }}>{l}</AppText>
            </Pressable>
          );
        })}
      </View>
      {groups.length === 0 ? <DeskEmpty icon="allTasks" title="No open tasks" text="Everything's done or there's nothing yet. Press Q to add one." /> : null}
      {groups.map((g) => {
        const shut = collapsed.has(g.key);
        return (
          <View key={g.key}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: !shut }}
              onPress={() => setCollapsed((s) => (s.has(g.key) ? new Set([...s].filter((x) => x !== g.key)) : new Set(s).add(g.key)))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 20, paddingBottom: 10 }}
            >
              {g.color ? <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: listColors[g.color as keyof typeof listColors] }} /> : null}
              <AppText tone="secondary" style={{ ...font(700), fontSize: 14 }}>{`${g.label} · ${g.tasks.length}`}</AppText>
              {shut ? (
                <AppText tone="secondary" style={{ ...font(600), fontSize: 14 }}>
                  · collapsed
                </AppText>
              ) : null}
            </Pressable>
            {shut ? null : (
              <DeskCard>
                {g.tasks.map((t, i) => {
                  const late = !!t.dueDate && t.dueDate < today;
                  const tagText = t.tagIds.map((id) => tags.find((x) => x.id === id)?.name).filter(Boolean).map((n) => `#${n}`).join(' ');
                  const subs = t.subtasks.length ? `${t.subtasks.filter((s) => s.doneAt).length} of ${t.subtasks.length} subtasks` : null;
                  return <TaskRowDesk key={t.id} task={t} last={i === g.tasks.length - 1} sub={[dueShort(t, today), subs, tagText].filter(Boolean).join(' · ')} subTone={late ? 'danger' : undefined} />;
                })}
              </DeskCard>
            )}
          </View>
        );
      })}
    </DeskPage>
  );
}

// ─── Tag ─────────────────────────────────────────────────────────────────────

/** WTag: tag view across lists, with Rename, Delete tag and "Add with #design". */
export function TagDesk({ id }: { id: string }) {
  const { c } = useTheme();
  const sheets = useSheets();
  const snack = useSnackbar();
  const { today } = useToday();
  const tag = useStore((s) => s.tags.find((t) => t.id === id));
  const allTasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const [showDone, setShowDone] = useState(false);
  const tasks = visibleTasks(allTasks, lists);
  const groups = tag ? tagGroups(tasks, tag.id, today) : [];
  const openTasks = groups.flatMap((g) => g.tasks);
  const done = tag ? tasks.filter((t) => t.doneAt && t.tagIds.includes(tag.id)) : [];
  useRows(openTasks.map((t) => t.id));
  if (!tag) return <DeskPage>{null}</DeskPage>;
  const listCount = new Set(openTasks.map((t) => t.listId ?? 'none')).size;
  const sub = (t: Task) => {
    const l = lists.find((x) => x.id === t.listId);
    return (
      <>
        {l ? <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: listColors[l.color] }} /> : null}
        <AppText tone="secondary" style={{ fontSize: 13 }}>
          {[l?.name, t.dueDate ? dueShort(t, today) : 'No date'].filter(Boolean).join(' · ')}
        </AppText>
      </>
    );
  };
  return (
    <DeskPage>
      <DeskHeader
        pre={`Tag · ${openTasks.length} open task${openTasks.length === 1 ? '' : 's'}${listCount > 1 ? ' across lists' : ''}`}
        title={`#${tag.name}`}
        actions={
          <>
            <SoftButton label="Rename" onPress={() => sheets.open(() => <TagMenuSheet tagId={tag.id} />)} />
            <SoftButton
              label="Delete tag"
              tone="danger"
              onPress={() =>
                sheets.open(
                  () => (
                    <DeskConfirm
                      title={`Delete #${tag.name}?`}
                      body={`The tag is removed from ${openTasks.length + done.length} task${openTasks.length + done.length === 1 ? '' : 's'}. The tasks themselves stay where they are.`}
                      confirmLabel="Delete tag"
                      onConfirm={() => {
                        goMain('/');
                        useStore.getState().deleteTag(tag.id);
                        snack({ title: `Deleted #${tag.name}` });
                      }}
                    />
                  ),
                  'dialog',
                )
              }
            />
            <KeyButton label={`Add with #${tag.name}`} k="Q" onPress={() => openQuickAdd({ text: `#${tag.name} ` })} />
          </>
        }
      />
      {openTasks.length ? (
        <>
          <GroupLab first>{`Open · ${openTasks.length}`}</GroupLab>
          <DeskCard>
            {openTasks.map((t, i) => (
              <TaskRowDesk key={t.id} task={t} last={i === openTasks.length - 1} sub={sub(t)} />
            ))}
          </DeskCard>
        </>
      ) : (
        <DeskEmpty glyph="#" title={`No open tasks with #${tag.name}`} text={`Type #${tag.name} when adding a task to tag it.`} />
      )}
      {done.length ? (
        <>
          <GroupLab>{`Done · ${done.length}`}</GroupLab>
          {showDone ? (
            <DeskCard>
              {done.map((t, i) => (
                <TaskRowDesk key={t.id} task={t} last={i === done.length - 1} sub={sub(t)} />
              ))}
            </DeskCard>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setShowDone(true)} style={{ alignSelf: 'flex-start' }}>
              <AppText style={{ ...font(700), fontSize: 14, color: c.accentText }}>Show completed</AppText>
            </Pressable>
          )}
        </>
      ) : null}
    </DeskPage>
  );
}

