import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { ConfirmDialog } from '@/components/Dialog';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet, useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { SwitchKnob } from '@/components/Switch';
import { OptionGroup, SheetTitle } from '@/components/ui';
import { useStore } from '@/store/store';
import type { ListSort } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, radius } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { goMain } from '../nav';
import { ListEditSheet } from './ListEditSheet';
import { OptionRow } from './parts';

const SORT_LABEL: Record<ListSort, string> = { date: 'Date', priority: 'Priority', title: 'Title' };

/** NListMenu: ⋯ on a list. */
export function ListMenuSheet({ listId }: { listId: string }) {
  const close = useCloseSheet();
  const sheets = useSheets();
  const snack = useSnackbar();
  const list = useStore((s) => s.lists.find((l) => l.id === listId));
  const tasks = useStore((s) => s.tasks);
  const updateList = useStore((s) => s.updateList);
  const archiveList = useStore((s) => s.archiveList);
  const deleteList = useStore((s) => s.deleteList);
  if (!list) return null;

  const mine = tasks.filter((t) => t.listId === listId && !t.deletedAt);
  const open = mine.filter((t) => !t.doneAt).length;
  const done = mine.length - open;

  const archive = () => {
    close();
    const undo = archiveList(listId);
    goMain('/');
    snack({ title: `"${list.name}" archived`, sub: 'Restore it from Settings › Lists', actions: [{ label: 'Undo', onPress: undo }] });
  };

  const confirmDelete = () => {
    close();
    sheets.open(
      () => (
        <ConfirmDialog
          title={`Delete "${list.name}"?`}
          body={`Its ${open} open task${open === 1 ? '' : 's'} and ${done} done task${done === 1 ? '' : 's'} go to Trash for 30 days. You can restore them from there.`}
          extra={<ArchiveInstead onArchive={archive} />}
          confirmLabel="Delete list"
          onConfirm={() => {
            const undo = deleteList(listId);
            goMain('/');
            snack({ title: 'List deleted', sub: 'Its tasks are in Trash for 30 days', actions: [{ label: 'Undo', onPress: undo }] });
          }}
        />
      ),
      'dialog',
    );
  };

  return (
    <SheetCard label="List options" gap={14} style={{ paddingBottom: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: listColors[list.color] }} />
        <View>
          <AppText style={{ ...font(800), fontSize: 18 }}>{list.name}</AppText>
          <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 2 }}>
            {open} open · {done} done
          </AppText>
        </View>
      </View>
      <Group>
        <Row
          icon="edit"
          label="Rename and colour"
          onPress={() => {
            close();
            sheets.open(() => <ListEditSheet listId={listId} />);
          }}
        />
        <Row
          icon="sort"
          label="Sort tasks by"
          value={SORT_LABEL[list.sortBy]}
          onPress={() => sheets.open(() => <SortSheet value={list.sortBy} onChange={(sortBy) => updateList(listId, { sortBy })} />)}
        />
        <Row
          icon="completed"
          label="Show done tasks"
          role="switch"
          checked={list.showDone}
          trailing={<SwitchKnob on={list.showDone} />}
          last
          onPress={() => updateList(listId, { showDone: !list.showDone })}
        />
      </Group>
      <Group>
        <Row icon="archive" label="Archive list" hint="Hides it and its tasks. Restore anytime." onPress={archive} />
        <Row icon="trash" label="Delete list" danger last onPress={confirmDelete} />
      </Group>
    </SheetCard>
  );
}

function ArchiveInstead({ onArchive }: { onArchive: () => void }) {
  const close = useCloseSheet();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
      <AppText tone="secondary" style={{ fontSize: 14, lineHeight: 21 }}>
        Want to keep the tasks?{' '}
      </AppText>
      <PressScale
        accessibilityRole="button"
        onPress={() => {
          close();
          onArchive();
        }}
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <AppText tone="accent" style={{ ...font(700), fontSize: 14 }}>
          Archive instead
        </AppText>
      </PressScale>
    </View>
  );
}

function SortSheet({ value, onChange }: { value: ListSort; onChange: (v: ListSort) => void }) {
  const close = useCloseSheet();
  const options: ListSort[] = ['date', 'priority', 'title'];
  return (
    <SheetCard label="Sort tasks by" style={{ paddingBottom: 28 }}>
      <SheetTitle>Sort tasks by</SheetTitle>
      <OptionGroup label="Sort tasks by">
        {options.map((o, i) => (
          <OptionRow
            key={o}
            label={SORT_LABEL[o]}
            selected={value === o}
            last={i === options.length - 1}
            onPress={() => {
              onChange(o);
              close();
            }}
          />
        ))}
      </OptionGroup>
    </SheetCard>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <View style={{ backgroundColor: c.ground, borderRadius: radius.card, overflow: 'hidden' }}>{children}</View>;
}

function Row({
  icon,
  label,
  hint,
  value,
  danger,
  last,
  role = 'button',
  checked,
  trailing,
  onPress,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  value?: string;
  danger?: boolean;
  last?: boolean;
  role?: 'button' | 'switch';
  checked?: boolean;
  trailing?: React.ReactNode;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <PressScale
      kind="row"
      accessibilityRole={role}
      accessibilityState={role === 'switch' ? { checked: !!checked } : undefined}
      accessibilityLabel={[label, value, hint].filter(Boolean).join(', ')}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 18, paddingVertical: hint ? 10 : 0, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.card }}
    >
      <Icon name={icon} color={danger ? c.dangerText : c.textSecondary} />
      <View style={{ flexShrink: 1 }}>
        <AppText style={{ ...font(600), fontSize: 16, color: danger ? c.dangerText : c.text }}>{label}</AppText>
        {hint ? (
          <AppText tone="secondary" style={{ fontSize: 13, marginTop: 2 }}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {value ? <AppText style={{ marginLeft: 'auto', ...font(700), fontSize: 14.5, color: c.accentText }}>{value}</AppText> : null}
      {trailing ? <View style={{ marginLeft: 'auto' }}>{trailing}</View> : null}
    </PressScale>
  );
}
