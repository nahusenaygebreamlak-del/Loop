import { EmptyState } from '@/components/EmptyState';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { SheetTitle } from '@/components/ui';
import { relativeDay } from '@/lib/dates';
import { sortedToday } from '@/lib/inboxViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { font } from '@/theme/typography';

/** NUndoSorting: everything sorted today, each with Undo. */
export function UndoSortingSheet() {
  const { c } = useTheme();
  const close = useCloseSheet();
  const { today } = useToday();
  const inbox = useStore((s) => s.inbox);
  const tasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const unsort = useStore((s) => s.unsortInbox);
  const items = sortedToday(inbox, today);

  const outcome = (id: string) => {
    const i = items.find((x) => x.id === id)!;
    if (i.sortedOutcome === 'note') return { text: 'Moved to Notes', danger: false };
    if (i.sortedOutcome === 'deleted') return { text: 'Deleted · in Trash', danger: true };
    const t = tasks.find((x) => x.id === i.sortedRefId);
    const list = lists.find((l) => l.id === t?.listId)?.name;
    return { text: ['Task', t?.dueDate ? relativeDay(t.dueDate, today) : null, list].filter(Boolean).join(' · '), danger: false };
  };

  return (
    <SheetCard label="Undo sorting" style={{ paddingBottom: 28 }}>
      <SheetTitle hint="Undo puts a note back in the Inbox. Available until midnight.">Sorted today</SheetTitle>
      {items.length === 0 ? (
        <EmptyState style={{ marginHorizontal: 0, backgroundColor: c.ground }} icon="undo" title="Nothing left to undo today" text="Everything sorted today is back in the Inbox or already undone." />
      ) : (
        <>
          <View style={{ backgroundColor: c.ground, borderRadius: radius.card, overflow: 'hidden' }}>
            {items.map((i, n) => {
              const o = outcome(i.id);
              return (
                <View
                  key={i.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, paddingLeft: 18, paddingRight: 10, borderBottomWidth: n < items.length - 1 ? 1 : 0, borderBottomColor: c.card }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText numberOfLines={1} style={{ ...font(700), fontSize: 15.5 }}>
                      {i.text}
                    </AppText>
                    <AppText style={{ fontSize: 13.5, marginTop: 3, color: o.danger ? c.dangerText : c.textSecondary }}>{o.text}</AppText>
                  </View>
                  <PressScale
                    accessibilityRole="button"
                    accessibilityLabel={`Undo: ${i.text}`}
                    onPress={() => unsort(i.id)}
                    style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.card, justifyContent: 'center' }}
                  >
                    <AppText tone="accent" style={{ ...font(700), fontSize: 14 }}>
                      Undo
                    </AppText>
                  </PressScale>
                </View>
              );
            })}
          </View>
          <PressScale
            accessibilityRole="button"
            onPress={() => {
              items.forEach((i) => unsort(i.id));
              close();
            }}
            style={{ minHeight: 52, borderRadius: 16, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppText style={{ ...font(700), fontSize: 15 }}>Put all {items.length} back in the Inbox</AppText>
          </PressScale>
        </>
      )}
    </SheetCard>
  );
}
