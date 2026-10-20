import { useState } from 'react';
import { Pressable, View, type ViewInstance } from 'react-native';
import { AppText } from '@/components/AppText';
import { Check } from '@/components/Check';
import { useSheets } from '@/components/Sheet';
import { useTaskActions } from '@/features/useTaskActions';
import { formatTime, relativeDay, toKey, todayKey, weekOf } from '@/lib/dates';
import { completedGroups, liveLists } from '@/lib/taskViews';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import type { Task } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { useContextMenu } from '../dom';
import { MenuCard, MenuItem, useOpenTaskMenu } from '../Menu';
import { selectTask, useDeskState } from '../state';
import { DeskCard, DeskEmpty, DeskHeader, DeskPage, GroupLab } from '../ui';

const timeOf = (iso: string) => formatTime(new Date(iso).toTimeString().slice(0, 5));

/** WCompleted: grouped by day, Mark not done on hover. */
export function CompletedDesk() {
  const { c } = useTheme();
  const sheets = useSheets();
  const tasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const weekStart = useSettings((s) => s.weekStart);
  const [filter, setFilter] = useState<string>('all');
  const [more, setMore] = useState(false);
  const today = todayKey();
  const groups = completedGroups(tasks, filter, (iso) => toKey(new Date(iso)));
  const thisWeek = weekOf(today, weekStart);
  const doneThisWeek = tasks.filter((t) => t.doneAt && !t.deletedAt && thisWeek.includes(toKey(new Date(t.doneAt)))).length;
  const shown = more ? groups : groups.slice(0, 2);
  const hidden = groups.slice(2).reduce((n, g) => n + g.tasks.length, 0);
  const filterName = filter === 'all' ? 'All lists' : (lists.find((l) => l.id === filter)?.name ?? 'All lists');

  return (
    <DeskPage>
      <DeskHeader
        pre={`${doneThisWeek} done this week`}
        title="Completed"
        actions={
          <Pressable
            accessibilityRole="button"
            onPress={(e) => {
              const n = e.nativeEvent as unknown as { pageX: number; pageY: number };
              sheets.open(
                () => (
                  <MenuCard label="Filter by list" width={220}>
                    <MenuItem label="All lists" onPress={() => setFilter('all')} />
                    {liveLists(lists).map((l) => (
                      <MenuItem key={l.id} label={l.name} onPress={() => setFilter(l.id)} />
                    ))}
                  </MenuCard>
                ),
                'menu',
                { x: n.pageX, y: n.pageY + 16, alignRight: true },
              );
            }}
            style={{ minHeight: 42, paddingHorizontal: 16, borderRadius: 13, backgroundColor: c.card, justifyContent: 'center' }}
          >
            <AppText style={{ ...font(700), fontSize: 14 }}>{`${filterName} ▾`}</AppText>
          </Pressable>
        }
      />
      {groups.length === 0 ? <DeskEmpty icon="check" title="Nothing done yet" text="Ticked tasks collect here, so you can see what you got through." /> : null}
      {shown.map((g, gi) => (
        <View key={g.key}>
          <GroupLab first={gi === 0}>{`${relativeDay(g.key, today)} · ${g.tasks.length}`}</GroupLab>
          <DeskCard>
            {g.tasks.map((t, i) => (
              <DoneRow key={t.id} task={t} last={i === g.tasks.length - 1} listName={lists.find((l) => l.id === t.listId)?.name} />
            ))}
          </DeskCard>
        </View>
      ))}
      {!more && hidden ? (
        <>
          <GroupLab>{`Earlier · ${hidden}`}</GroupLab>
          <Pressable accessibilityRole="button" onPress={() => setMore(true)} style={{ alignSelf: 'flex-start' }}>
            <AppText style={{ ...font(700), fontSize: 14, color: c.accentText }}>{`Show ${hidden} more`}</AppText>
          </Pressable>
        </>
      ) : null}
    </DeskPage>
  );
}

function DoneRow({ task, last, listName }: { task: Task; last: boolean; listName?: string }) {
  const { c } = useTheme();
  const actions = useTaskActions();
  const openMenu = useOpenTaskMenu();
  const selected = useDeskState((s) => s.selected?.kind === 'task' && s.selected.id === task.id);
  const menuRef = useContextMenu<ViewInstance>((x, y) => openMenu(task.id, x, y));
  const [hover, setHover] = useState(false);
  return (
    <View ref={menuRef}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => selectTask(task.id)}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6, paddingLeft: 12, paddingRight: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.ground, backgroundColor: selected ? c.tint : hover ? c.desk.hover : 'transparent' }}
      >
        <Check done label={task.title} onToggle={() => actions.toggle(task.id)} />
        <View style={{ flex: 1 }}>
          <AppText numberOfLines={1} style={{ ...font(700), fontSize: 15, color: c.textSecondary, textDecorationLine: 'line-through' }}>
            {task.title}
          </AppText>
          <AppText tone="secondary" style={{ fontSize: 13, marginTop: 2 }}>
            {[listName, timeOf(task.doneAt!)].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        {hover || selected ? (
          <Pressable accessibilityRole="button" onPress={() => actions.toggle(task.id)} style={{ minHeight: 34, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.card, justifyContent: 'center' }}>
            <AppText style={{ ...font(700), fontSize: 13.5 }}>Mark not done</AppText>
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

/** A finished task in the panel: when it was done, when it was due, Mark not done. */
export function DonePanel({ task, onClose }: { task: Task; onClose: () => void }) {
  const { c } = useTheme();
  const actions = useTaskActions();
  const list = useStore((s) => s.lists.find((l) => l.id === task.listId));
  const today = todayKey();
  const done = new Date(task.doneAt!);
  void onClose;
  const rows: [string, React.ReactNode][] = [
    ['Done', `${relativeDay(toKey(done), today)}, ${timeOf(task.doneAt!)}`],
    ['Was due', task.dueDate ? relativeDay(task.dueDate, today) : 'No date'],
    [
      'List',
      <View key="l" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {list ? <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: listColors[list.color] }} /> : null}
        <AppText style={{ ...font(700), fontSize: 14.5 }}>{list?.name ?? 'None'}</AppText>
      </View>,
    ],
  ];
  return (
    <View style={{ flex: 1, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {list ? <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: listColors[list.color] }} /> : null}
        <AppText tone="secondary" style={{ ...font(600), fontSize: 13 }}>
          {list?.name ?? 'No list'}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <AppText accessibilityRole="header" style={{ flex: 1, ...font(800), fontSize: 24, lineHeight: 30, color: c.textSecondary, textDecorationLine: 'line-through' }}>
          {task.title}
        </AppText>
        <View style={{ marginTop: -6, marginRight: -8 }}>
          <Check done label={task.title} onToggle={() => actions.toggle(task.id)} />
        </View>
      </View>
      <View style={{ backgroundColor: c.ground, borderRadius: 18 }}>
        {rows.map(([k, v], i) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, paddingHorizontal: 16, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: c.card }}>
            <AppText tone="secondary" style={{ ...font(600), fontSize: 14.5 }}>
              {k}
            </AppText>
            {typeof v === 'string' ? <AppText style={{ ...font(700), fontSize: 14.5 }}>{v}</AppText> : v}
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => actions.toggle(task.id)} style={{ minHeight: 52, borderRadius: 16, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}>
        <AppText style={{ ...font(700), fontSize: 15 }}>Mark not done</AppText>
      </Pressable>
      <View style={{ flex: 1 }} />
      <AppText tone="secondary" style={{ fontSize: 12.5 }}>
        Completed tasks are kept. Delete one to move it to Trash.
      </AppText>
    </View>
  );
}

