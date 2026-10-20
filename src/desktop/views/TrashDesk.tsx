import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { formatTime, relativeDay, toKey, todayKey } from '@/lib/dates';
import { daysLeft, dueShort, trashEntries, type TrashEntry } from '@/lib/taskViews';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { DeskConfirm } from '../Dialog';
import { useDeskState } from '../state';
import { DeskCard, DeskEmpty, DeskHeader, DeskPage, GroupLab } from '../ui';
import { EmptyPanel } from '../TaskPanel';

const KIND = { task: 'Task', inbox: 'Inbox note', note: 'Note' } as const;

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? 'deleted today' : d === 1 ? 'deleted yesterday' : `deleted ${d} days ago`;
};

/** WTrash: 30-day note, days left on each item (red at 3 or fewer), Restore on hover. */
export function TrashDesk() {
  const { c } = useTheme();
  const sheets = useSheets();
  const snack = useSnackbar();
  const tasks = useStore((s) => s.tasks);
  const inbox = useStore((s) => s.inbox);
  const notes = useStore((s) => s.notes);
  const lists = useStore((s) => s.lists);
  const purgeExpired = useStore((s) => s.purgeExpired);
  const selected = useDeskState((s) => (s.selected?.kind === 'trash' ? s.selected : null));
  useEffect(() => purgeExpired(), [purgeExpired]);
  const entries = trashEntries(tasks, inbox, notes);
  const now = new Date();
  const counts = { task: entries.filter((e) => e.kind === 'task').length, note: entries.filter((e) => e.kind !== 'task').length };
  const where = (e: TrashEntry) => (e.kind === 'task' ? (lists.find((l) => l.id === tasks.find((t) => t.id === e.id)?.listId)?.name ?? 'Inbox') : e.kind === 'inbox' ? 'Inbox' : 'Notes');

  const emptyAll = () => {
    const parts = [counts.task ? `${counts.task} task${counts.task === 1 ? '' : 's'}` : null, counts.note ? `${counts.note} note${counts.note === 1 ? '' : 's'}` : null].filter(Boolean).join(' and ');
    sheets.open(
      () => (
        <DeskConfirm
          title="Empty trash?"
          body={`${entries.length} item${entries.length === 1 ? '' : 's'} will be deleted for good: ${parts}. This can't be undone.`}
          confirmLabel={`Delete ${entries.length} item${entries.length === 1 ? '' : 's'}`}
          onConfirm={() => {
            useStore.getState().emptyTrash();
            useDeskState.setState({ selected: null });
            snack({ title: 'Trash emptied' });
          }}
        />
      ),
      'dialog',
    );
  };

  return (
    <DeskPage>
      <DeskHeader
        pre={`${entries.length} item${entries.length === 1 ? '' : 's'}`}
        title="Trash"
        actions={
          entries.length ? (
            <Pressable accessibilityRole="button" onPress={emptyAll} style={{ minHeight: 42, paddingHorizontal: 16, borderRadius: 13, backgroundColor: c.card, justifyContent: 'center' }}>
              <AppText style={{ ...font(700), fontSize: 14, color: c.dangerText }}>Empty trash</AppText>
            </Pressable>
          ) : null
        }
      />
      {entries.length === 0 ? (
        <DeskEmpty icon="trash" title="Trash is empty" text="Deleted things wait here for 30 days before they're gone for good." />
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18, backgroundColor: c.card, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16 }}>
            <View aria-hidden style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="clock" size={18} color={c.textSecondary} />
            </View>
            <AppText tone="secondary" style={{ fontSize: 14.5 }}>
              Things in Trash are deleted for good after 30 days.
            </AppText>
          </View>
          <GroupLab first>Deleted</GroupLab>
          <DeskCard>
            {entries.map((e, i) => {
              const left = daysLeft(e.deletedAt, now);
              const on = selected?.id === e.id;
              return (
                <TrashRow
                  key={`${e.kind}-${e.id}`}
                  title={e.title}
                  sub={[KIND[e.kind], e.kind === 'task' ? where(e) : null, ago(e.deletedAt)].filter(Boolean).join(' · ')}
                  left={left}
                  selected={on}
                  last={i === entries.length - 1}
                  onPress={() => useDeskState.setState({ selected: { kind: 'trash', entry: e.kind, id: e.id } })}
                  onRestore={() => {
                    useStore.getState().restore(e.kind, e.id);
                    if (on) useDeskState.setState({ selected: null });
                    snack({ title: `Restored to ${where(e)}` });
                  }}
                />
              );
            })}
          </DeskCard>
        </>
      )}
    </DeskPage>
  );
}

function TrashRow({ title, sub, left, selected, last, onPress, onRestore }: { title: string; sub: string; left: number; selected: boolean; last: boolean; onPress: () => void; onRestore: () => void }) {
  const { c } = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6, paddingLeft: 18, paddingRight: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.ground, backgroundColor: selected ? c.tint : hover ? c.desk.hover : 'transparent' }}
    >
      <View style={{ flex: 1 }}>
        <AppText numberOfLines={1} style={{ ...font(700), fontSize: 15 }}>
          {title}
        </AppText>
        <AppText tone="secondary" style={{ fontSize: 13, marginTop: 2 }}>
          {`${sub} · `}
          <AppText style={{ fontSize: 13, color: left <= 3 ? c.dangerText : c.textSecondary, ...(left <= 3 ? font(700) : {}) }}>{`${left} day${left === 1 ? '' : 's'} left`}</AppText>
        </AppText>
      </View>
      {hover || selected ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Restore ${title}`} onPress={onRestore} style={{ minHeight: 34, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.card, justifyContent: 'center' }}>
          <AppText style={{ ...font(700), fontSize: 13.5 }}>Restore</AppText>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

/** A deleted item in the panel: where it was, when it was deleted, Restore to [list] / Delete forever. */
export function TrashPanel({ entry, id, onClose }: { entry: 'task' | 'inbox' | 'note'; id: string; onClose: () => void }) {
  const { c } = useTheme();
  const sheets = useSheets();
  const snack = useSnackbar();
  const tasks = useStore((s) => s.tasks);
  const inbox = useStore((s) => s.inbox);
  const notes = useStore((s) => s.notes);
  const lists = useStore((s) => s.lists);
  const e = trashEntries(tasks, inbox, notes).find((x) => x.kind === entry && x.id === id);
  if (!e) return <EmptyPanel />;
  const task = entry === 'task' ? tasks.find((t) => t.id === id) : undefined;
  const list = lists.find((l) => l.id === task?.listId);
  const whereName = entry === 'task' ? (list?.name ?? 'Inbox') : entry === 'inbox' ? 'Inbox' : 'Notes';
  const left = daysLeft(e.deletedAt, new Date());
  const deleted = new Date(e.deletedAt);
  const rows: [string, React.ReactNode][] = [
    [
      'Was in',
      <View key="w" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {list ? <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: listColors[list.color] }} /> : null}
        <AppText style={{ ...font(700), fontSize: 14.5 }}>{whereName}</AppText>
      </View>,
    ],
    ...(task ? ([['Date', task.dueDate ? dueShort(task, todayKey()) : 'None']] as [string, string][]) : []),
    ['Deleted', `${relativeDay(toKey(deleted), todayKey())}, ${formatTime(deleted.toTimeString().slice(0, 5))}`],
  ];
  return (
    <View style={{ flex: 1, gap: 16 }}>
      <AppText style={{ ...font(600), fontSize: 13, color: left <= 3 ? c.dangerText : c.textSecondary }}>{`In Trash · ${left} day${left === 1 ? '' : 's'} left`}</AppText>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 24, lineHeight: 30 }}>
        {e.title}
      </AppText>
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
      <PrimaryButton
        label={`Restore to ${whereName}`}
        onPress={() => {
          useStore.getState().restore(entry, id);
          onClose();
          snack({ title: `Restored to ${whereName}` });
        }}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          sheets.open(
            () => (
              <DeskConfirm
                title="Delete forever?"
                body={`"${e.title}" will be gone for good. This can't be undone.`}
                confirmLabel="Delete forever"
                onConfirm={() => {
                  useStore.getState().purge(entry, id);
                  onClose();
                }}
              />
            ),
            'dialog',
          )
        }
        style={{ minHeight: 52, borderRadius: 16, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}
      >
        <AppText style={{ ...font(700), fontSize: 15, color: c.dangerText }}>Delete forever</AppText>
      </Pressable>
      <View style={{ flex: 1 }} />
      <AppText tone="secondary" style={{ fontSize: 12.5 }}>
        {"Items in Trash can't be edited. Restore it first."}
      </AppText>
    </View>
  );
}
