import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { SheetButton } from '@/components/ui';
import { monthDay, toKey } from '@/lib/dates';
import { daysLeft, type TrashEntry } from '@/lib/taskViews';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { PressScale } from '@/components/PressScale';

const KIND = { task: 'task', inbox: 'Inbox note', note: 'note' } as const;

/** NTrashItem */
export function TrashItemSheet({ entry }: { entry: TrashEntry }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const snack = useSnackbar();
  const task = useStore((s) => (entry.kind === 'task' ? s.tasks.find((t) => t.id === entry.id) : undefined));
  const note = useStore((s) => (entry.kind === 'note' ? s.notes.find((n) => n.id === entry.id) : undefined));
  const list = useStore((s) => s.lists.find((l) => l.id === task?.listId));
  const restore = useStore((s) => s.restore);
  const purge = useStore((s) => s.purge);

  const left = daysLeft(entry.deletedAt, new Date());
  const body = task?.notes || note?.body.map((b) => b.text).join('\n') || '';
  const where = entry.kind === 'task' ? (list?.name ?? 'Inbox') : entry.kind === 'inbox' ? 'Inbox' : 'Notes';

  const rows: [string, React.ReactNode][] = [
    [
      'Was in',
      <View key="w" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {list ? <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: listColors[list.color] }} /> : null}
        <AppText style={{ ...font(700), fontSize: 15 }}>{where}</AppText>
      </View>,
    ],
    ...(task?.dueDate ? ([['Was due', monthDay(task.dueDate)]] as [string, string][]) : []),
    ['Deleted', monthDay(toKey(new Date(entry.deletedAt)))],
  ];

  return (
    <SheetCard label={`Deleted ${KIND[entry.kind]}`} style={{ paddingBottom: 28 }}>
      <View>
        <AppText style={{ ...font(700), fontSize: 13, color: left <= 3 ? c.dangerText : c.textSecondary }}>
          Deleted · {left} day{left === 1 ? '' : 's'} left
        </AppText>
        <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 22, lineHeight: 29, marginTop: 6 }}>
          {entry.title}
        </AppText>
        {body ? (
          <AppText tone="secondary" style={{ fontSize: 14.5, lineHeight: 22, marginTop: 8 }} numberOfLines={4}>
            {body}
          </AppText>
        ) : null}
      </View>
      <View style={{ backgroundColor: c.ground, borderRadius: 18, overflow: 'hidden' }}>
        {rows.map(([k, v], i) => (
          <View
            key={k}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 18, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: c.card }}
          >
            <AppText tone="secondary" style={{ ...font(600), fontSize: 15 }}>
              {k}
            </AppText>
            {typeof v === 'string' ? <AppText style={{ ...font(700), fontSize: 15 }}>{v}</AppText> : v}
          </View>
        ))}
      </View>
      <SheetButton
        label={`Restore to ${where}`}
        onPress={() => {
          restore(entry.kind, entry.id);
          close();
          snack({ title: `Restored to ${where}` });
        }}
      />
      <PressScale
        accessibilityRole="button"
        onPress={() => {
          purge(entry.kind, entry.id);
          close();
        }}
        style={{ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
      >
        <AppText tone="danger" style={{ ...font(700), fontSize: 15 }}>
          Delete for good
        </AppText>
      </PressScale>
    </SheetCard>
  );
}
