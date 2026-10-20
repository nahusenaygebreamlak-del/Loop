import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useCloseSheet, useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { SwitchKnob } from '@/components/Switch';
import { goMain } from '@/features/nav';
import { ListEditSheet } from '@/features/sheets/ListEditSheet';
import { listGroups, listRowSub, openCount, sortTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import type { ListColor, ListSort } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { Kbd } from '../Kbd';
import { MenuItem, MenuSeparator } from '../Menu';
import { openQuickAdd } from '../state';
import { DeskCard, DeskEmpty, DeskHeader, DeskPage, GroupLab, IconButton2, KeyButton, TaskRowDesk, useRows } from '../ui';

const COLORS: ListColor[] = ['work', 'personal', 'learning', 'purple', 'pink', 'slate'];
const SORT_LABEL: Record<ListSort, string> = { date: 'Date', priority: 'Priority', title: 'Title' };

/** WList: one list, grouped by date. */
export function ListDesk({ id }: { id: string }) {
  const { c } = useTheme();
  const sheets = useSheets();
  const { today } = useToday();
  const list = useStore((s) => s.lists.find((l) => l.id === id));
  const tasks = useStore((s) => s.tasks);
  const tags = useStore((s) => s.tags);
  const groups = list ? listGroups(tasks, list.id, today, new Set()).map((g) => (list.sortBy === 'date' ? g : { ...g, tasks: sortTasks(g.tasks, list.sortBy) })) : [];
  const done = list?.showDone ? tasks.filter((t) => t.listId === id && t.doneAt && !t.deletedAt).sort((a, b) => b.doneAt!.localeCompare(a.doneAt!)) : [];
  useRows(groups.flatMap((g) => g.tasks.map((t) => t.id)));
  if (!list || list.deletedAt) return <DeskPage>{null}</DeskPage>;
  const open = openCount(tasks, list.id);

  return (
    <DeskPage>
      <DeskHeader
        pre={`List · ${open} open task${open === 1 ? '' : 's'}`}
        preLead={<View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: listColors[list.color] }} />}
        title={list.name}
        actions={
          <>
            <IconButton2 icon="more" label="List options" onPress={(x, y) => sheets.open(() => <ListMenu listId={list.id} />, 'menu', { x, y, alignRight: true })} />
            <KeyButton label={`Add to ${list.name}`} k="Q" onPress={() => openQuickAdd({ list: list.id })} />
          </>
        }
      />
      {groups.length === 0 && !done.length ? (
        <DeskEmpty icon="listPlain" title={`Nothing in ${list.name} yet`} text="Add a task, or drag one here from another list in the sidebar.">
          <KeyButton label={`Add to ${list.name}`} k="Q" onPress={() => openQuickAdd({ list: list.id })} />
        </DeskEmpty>
      ) : null}
      {groups.map((g, gi) => (
        <View key={g.key}>
          <GroupLab danger={g.key === 'overdue'} first={gi === 0}>{`${g.label} · ${g.tasks.length}`}</GroupLab>
          <DeskCard>
            {g.tasks.map((t, i) => (
              <TaskRowDesk key={t.id} task={t} last={i === g.tasks.length - 1} sub={listRowSub(t, tags, today) || undefined} subTone={g.key === 'overdue' ? 'danger' : undefined} />
            ))}
          </DeskCard>
        </View>
      ))}
      {done.length ? (
        <View>
          <GroupLab>{`Done · ${done.length}`}</GroupLab>
          <DeskCard>
            {done.map((t, i) => (
              <TaskRowDesk key={t.id} task={t} last={i === done.length - 1} />
            ))}
          </DeskCard>
        </View>
      ) : null}
      {groups.length ? (
        <AppText style={{ marginTop: 16, fontSize: 12.5, color: c.textSecondary }}>Drag a task onto another list in the sidebar to move it. Right-click for quick actions.</AppText>
      ) : null}
    </DeskPage>
  );
}

/** WListMenu: Rename, Colour (inline swatches), Sort by, Show completed, Archive, Delete. */
function ListMenu({ listId }: { listId: string }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const sheets = useSheets();
  const snack = useSnackbar();
  const list = useStore((s) => s.lists.find((l) => l.id === listId));
  const updateList = useStore((s) => s.updateList);
  const [sortOpen, setSortOpen] = useState(false);
  if (!list) return null;
  return (
    <View accessibilityRole="menu" accessibilityLabel="List options" style={{ width: 270, backgroundColor: c.card, borderWidth: 1, borderColor: c.desk.border, borderRadius: 16, padding: 6 }}>
      <MenuItem
        label="Rename"
        onPress={() => {
          close();
          setTimeout(() => sheets.open(() => <ListEditSheet listId={listId} />, 'dialog'), 0);
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40, paddingHorizontal: 12 }}>
        <AppText style={{ flex: 1, ...font(600), fontSize: 14.5 }}>Colour</AppText>
        <View accessibilityRole="radiogroup" accessibilityLabel="Colour" style={{ flexDirection: 'row', gap: 5 }}>
          {COLORS.map((k) => {
            const on = list.color === k;
            return (
              <Pressable
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={k}
                onPress={() => updateList(listId, { color: k })}
                style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: listColors[k], outlineWidth: on ? 2 : 0, outlineStyle: 'solid', outlineColor: c.text, outlineOffset: 1 } as object}
              />
            );
          })}
        </View>
      </View>
      <MenuItem label="Sort by" value={`${SORT_LABEL[list.sortBy]} ›`} onPress={() => setSortOpen((v) => !v)} />
      {sortOpen ? (
        <View style={{ paddingLeft: 12 }}>
          {(Object.keys(SORT_LABEL) as ListSort[]).map((s) => (
            <MenuItem key={s} label={SORT_LABEL[s]} value={s === list.sortBy ? '✓' : undefined} onPress={() => updateList(listId, { sortBy: s })} />
          ))}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: list.showDone }}
        onPress={() => updateList(listId, { showDone: !list.showDone })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40, paddingHorizontal: 12, borderRadius: 10 }}
      >
        <AppText style={{ flex: 1, ...font(600), fontSize: 14.5 }}>Show completed</AppText>
        <View style={{ transform: [{ scale: 0.8 }] }}>
          <SwitchKnob on={list.showDone} />
        </View>
      </Pressable>
      <MenuSeparator />
      <MenuItem
        label="Archive list"
        onPress={() => {
          close();
          const undo = useStore.getState().archiveList(listId);
          goMain('/');
          snack({ title: `"${list.name}" archived`, sub: 'Restore it from Settings › Lists', actions: [{ label: 'Undo', onPress: undo }] });
        }}
      />
      <MenuItem
        label="Delete list"
        danger
        onPress={() => {
          close();
          setTimeout(() => sheets.open(() => <DeleteListDialog listId={listId} />, 'dialog'), 0);
        }}
      />
    </View>
  );
}

/** WListDelete: choose whether the tasks move to Inbox (default) or get deleted too. */
function DeleteListDialog({ listId }: { listId: string }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const snack = useSnackbar();
  const list = useStore((s) => s.lists.find((l) => l.id === listId));
  const tasks = useStore((s) => s.tasks);
  const [keep, setKeep] = useState(true);
  if (!list) return null;
  const openTasks = tasks.filter((t) => t.listId === listId && !t.deletedAt && !t.doneAt);
  const confirm = () => {
    const s = useStore.getState();
    const undos = keep ? openTasks.map((t) => s.taskBackToInbox(t.id)) : [];
    const undoList = s.deleteList(listId);
    close();
    goMain('/');
    snack({
      title: 'List deleted',
      sub: keep && openTasks.length ? `${openTasks.length} task${openTasks.length === 1 ? '' : 's'} moved to Inbox` : 'Its tasks are in Trash for 30 days',
      actions: [
        {
          label: 'Undo',
          onPress: () => {
            undoList();
            undos.reverse().forEach((u) => u());
          },
        },
      ],
    });
  };
  const option = (label: string, on: boolean, onPress: () => void, last?: boolean) => (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, paddingHorizontal: 18, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.card }}
    >
      <AppText style={{ flex: 1, ...font(600), fontSize: 16 }}>{label}</AppText>
      <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: on ? 7 : 2, borderColor: on ? c.accent : c.line }} />
    </Pressable>
  );
  return (
    <View accessibilityRole="alert" style={{ width: 460, maxWidth: '100%', backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.desk.border, padding: 26, gap: 16 }}>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 21 }}>{`Delete "${list.name}"?`}</AppText>
      <AppText tone="secondary" style={{ fontSize: 14.5, lineHeight: 22 }}>
        {openTasks.length ? `It has ${openTasks.length} open task${openTasks.length === 1 ? '' : 's'}. What should happen to ${openTasks.length === 1 ? 'it' : 'them'}?` : 'It has no open tasks.'}
      </AppText>
      {openTasks.length ? (
        <View style={{ backgroundColor: c.ground, borderRadius: 18 }}>
          {option('Move them to Inbox', keep, () => setKeep(true))}
          {option('Delete them too', !keep, () => setKeep(false), true)}
        </View>
      ) : null}
      <AppText tone="secondary" style={{ fontSize: 13, lineHeight: 20 }}>
        The list goes to Trash for 30 days. Tip: Archive hides a list without deleting anything.
      </AppText>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <Pressable accessibilityRole="button" onPress={close} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.ground }}>
          <AppText style={{ ...font(800), fontSize: 14.5 }}>Cancel</AppText>
          <Kbd k="Esc" />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={confirm} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.danger }}>
          <AppText style={{ ...font(800), fontSize: 14.5, color: '#FFFFFF' }}>Delete list</AppText>
        </Pressable>
      </View>
    </View>
  );
}
