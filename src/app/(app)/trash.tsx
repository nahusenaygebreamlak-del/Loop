import { useEffect } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/Dialog';
import { PressScale } from '@/components/PressScale';
import { MainScroll, ScreenHeader } from '@/components/rows';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { Card } from '@/components/ui';
import { TrashItemSheet } from '@/features/sheets/TrashItemSheet';
import { useMenu } from '@/features/useMenu';
import { daysLeft, trashEntries } from '@/lib/taskViews';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';
import { font } from '@/theme/typography';

const KIND_LABEL = { task: 'Task', inbox: 'Inbox note', note: 'Note' } as const;

/** NTrash */
export default function Trash() {
  const { c } = useTheme();
  const sheets = useSheets();
  const snack = useSnackbar();
  const openMenu = useMenu();
  const tasks = useStore((s) => s.tasks);
  const inbox = useStore((s) => s.inbox);
  const notes = useStore((s) => s.notes);
  const lists = useStore((s) => s.lists);
  const restore = useStore((s) => s.restore);
  const emptyTrash = useStore((s) => s.emptyTrash);
  const purgeExpired = useStore((s) => s.purgeExpired);

  useEffect(() => purgeExpired(), [purgeExpired]);

  const entries = trashEntries(tasks, inbox, notes);
  const now = new Date();

  return (
    <MainScroll>
      <ScreenHeader onMenu={openMenu} subtitle="Deleted things stay here for 30 days" title="Trash" />
      <View style={{ height: 22 }} />
      {entries.length === 0 ? (
        <EmptyState icon="trash" title="Trash is empty" text="Deleted things wait here for 30 days before they're gone for good." />
      ) : (
        <>
          <Card>
            {entries.map((e, i) => {
              const left = daysLeft(e.deletedAt, now);
              const where = e.kind === 'task' ? (lists.find((l) => l.id === tasks.find((t) => t.id === e.id)?.listId)?.name ?? 'Inbox') : e.kind === 'inbox' ? 'Inbox' : 'Notes';
              return (
                <View
                  key={`${e.kind}-${e.id}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 66, paddingVertical: 10, paddingLeft: 20, paddingRight: 10, borderBottomWidth: i < entries.length - 1 ? 1 : 0, borderBottomColor: c.ground }}
                >
                  <PressScale
                    kind="row"
                    accessibilityRole="button"
                    accessibilityLabel={`${e.title}, ${KIND_LABEL[e.kind]}, ${left} days left`}
                    accessibilityHint="Shows details, with Restore and Delete for good"
                    onPress={() => sheets.open(() => <TrashItemSheet entry={e} />)}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <AppText numberOfLines={1} style={{ ...font(700), fontSize: 15.5 }}>
                      {e.title}
                    </AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: 7, backgroundColor: c.ground, marginRight: 6 }}>
                        <AppText tone="secondary" style={{ ...font(700), fontSize: 12 }}>
                          {KIND_LABEL[e.kind]}
                        </AppText>
                      </View>
                      <AppText style={{ fontSize: 13.5, color: left <= 3 ? c.dangerText : c.textSecondary }}>
                        {left} day{left === 1 ? '' : 's'} left
                      </AppText>
                    </View>
                  </PressScale>
                  <PressScale
                    accessibilityRole="button"
                    accessibilityLabel={`Restore ${e.title}`}
                    onPress={() => {
                      restore(e.kind, e.id);
                      snack({ title: `Restored to ${where}` });
                    }}
                    style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.ground, justifyContent: 'center' }}
                  >
                    <AppText tone="accent" style={{ ...font(700), fontSize: 14 }}>
                      Restore
                    </AppText>
                  </PressScale>
                </View>
              );
            })}
          </Card>
          <AppText tone="secondary" style={{ marginTop: 14, marginHorizontal: size.sideMargin, fontSize: 13.5, lineHeight: 20 }}>
            Tap an item to see it or delete it for good.
          </AppText>
          <View style={{ paddingHorizontal: size.sideMargin, paddingTop: 28 }}>
            <PressScale
              accessibilityRole="button"
              onPress={() =>
                sheets.open(
                  () => (
                    <ConfirmDialog
                      title="Empty Trash?"
                      body={`${entries.length} item${entries.length === 1 ? '' : 's'} will be deleted for good. This can't be undone.`}
                      extra={
                        <AppText tone="secondary" style={{ fontSize: 14, lineHeight: 21 }}>
                          Items left alone are deleted automatically after 30 days.
                        </AppText>
                      }
                      confirmLabel={`Delete ${entries.length} item${entries.length === 1 ? '' : 's'}`}
                      onConfirm={emptyTrash}
                    />
                  ),
                  'dialog',
                )
              }
              style={{ minHeight: 52, borderRadius: 16, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}
            >
              <AppText tone="danger" style={{ ...font(700), fontSize: 15 }}>
                Empty Trash now
              </AppText>
            </PressScale>
          </View>
        </>
      )}
    </MainScroll>
  );
}
