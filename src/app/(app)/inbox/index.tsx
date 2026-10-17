import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Pop } from '@/components/Motion';
import { EmptyState } from '@/components/EmptyState';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { MainScroll, ScreenHeader } from '@/components/rows';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { Card, GroupLabel } from '@/components/ui';
import { goMain } from '@/features/nav';
import { UndoSortingSheet } from '@/features/sheets/UndoSortingSheet';
import { useMenu } from '@/features/useMenu';
import { inboxOpen, sortedToday, sortEstimate, sortSummary, stampShort } from '@/lib/inboxViews';
import { useToday } from '@/lib/useToday';
import { formatTime, type TimeKey } from '@/lib/dates';
import { useLocal } from '@/store/local';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

/** "done in about a minute" from the first and last sort of the day. */
function doneIn(times: string[]): string {
  const span = (new Date(times[times.length - 1]).getTime() - new Date(times[0]).getTime()) / 60_000;
  const min = Math.max(1, Math.round(span));
  return min === 1 ? 'done in about a minute' : `done in about ${min} minutes`;
}

const startSort = (id?: string) => router.push(id ? { pathname: '/inbox/sort', params: { start: id } } : '/inbox/sort');

/** VInbox, and NAllSorted once everything has been sorted. */
export default function Inbox() {
  const { c } = useTheme();
  const sheets = useSheets();
  const snack = useSnackbar();
  const openMenu = useMenu();
  const { today } = useToday();
  const inbox = useStore((s) => s.inbox);
  const addInboxItem = useStore((s) => s.addInboxItem);
  const removeInboxItem = useStore((s) => s.removeInboxItem);
  const [dump, setDump] = useState('');
  const sortTime = useSettings((st) => st.sortTime);
  const sortOffered = useLocal((l) => l.sortOffered);

  const open = inboxOpen(inbox);
  // NSetupSort: offered once, when the Inbox reaches 5 notes and no sort reminder is set.
  const offerSort = open.length >= 5 && !sortTime && !sortOffered;
  const doneToday = sortedToday(inbox, today);
  const summary = sortSummary(doneToday);

  const save = () => {
    const text = dump.trim();
    if (!text) return;
    const id = addInboxItem(text);
    setDump('');
    snack({ title: 'Saved to Inbox', sub: text, actions: [{ label: 'Undo', onPress: () => removeInboxItem(id) }] });
  };

  return (
    <MainScroll>
      <ScreenHeader onMenu={openMenu} subtitle={open.length ? 'Notes to sort later' : 'Nothing waiting'} title="Inbox" />
      <View style={{ marginTop: 22, marginHorizontal: size.sideMargin, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 18, borderRadius: 18, backgroundColor: c.card }}>
        <Icon name="plus" color={c.textSecondary} />
        <TextInput
          value={dump}
          onChangeText={setDump}
          onSubmitEditing={save}
          submitBehavior="blurAndSubmit"
          returnKeyType="done"
          placeholder="Dump a thought"
          placeholderTextColor={c.textSecondary}
          accessibilityLabel="Dump a thought"
          accessibilityHint="Saves to the Inbox to sort later"
          style={[{ flex: 1, minWidth: 0, fontSize: 16, color: c.text, ...font(500) }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
        />
      </View>

      {offerSort ? <SortOffer /> : null}

      {open.length ? (
        <>
          <View style={{ marginTop: 14, marginHorizontal: size.sideMargin, paddingVertical: 18, paddingLeft: 20, paddingRight: 16, borderRadius: radius.card, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <AppText style={{ ...font(700), fontSize: 16, color: c.onAccent }}>
                {open.length} note{open.length === 1 ? '' : 's'} to sort
              </AppText>
              <AppText style={{ fontSize: 14, marginTop: 4, color: c.onAccentSecondary }}>{sortTime ? `Reminder at ${formatTime(sortTime)} daily` : sortEstimate(open.length)}</AppText>
            </View>
            <PressScale accessibilityRole="button" onPress={() => startSort()} style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 14, backgroundColor: '#FFFFFF', justifyContent: 'center' }}>
              <AppText style={{ ...font(700), fontSize: 14.5, color: '#2F6BE3' }}>Sort now</AppText>
            </PressScale>
          </View>
          <GroupLabel style={{ paddingTop: 24 }}>Recent</GroupLabel>
          <Card>
            {open.map((i, n) => (
              <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingLeft: 20, paddingRight: 12, borderBottomWidth: n < open.length - 1 ? 1 : 0, borderBottomColor: c.ground }}>
                <View style={{ flex: 1 }}>
                  <AppText style={{ ...font(600), fontSize: 15.5, lineHeight: 21 }}>{i.text}</AppText>
                  <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 4 }}>
                    {stampShort(i.createdAt, today)}
                  </AppText>
                </View>
                <PressScale
                  accessibilityRole="button"
                  accessibilityLabel={`Sort: ${i.text}`}
                  onPress={() => startSort(i.id)}
                  style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.ground, justifyContent: 'center' }}
                >
                  <AppText tone="accent" style={{ ...font(700), fontSize: 14 }}>
                    Sort
                  </AppText>
                </PressScale>
              </View>
            ))}
          </Card>
        </>
      ) : doneToday.length ? (
        <>
          <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: size.sideMargin }}>
            <Pop><View aria-hidden style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={32} strokeWidth={2.6} color={c.onAccent} />
            </View></Pop>
            <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 24, marginTop: 18 }}>
              All sorted
            </AppText>
            <AppText tone="secondary" style={{ fontSize: 15, marginTop: 6, textAlign: 'center' }}>
              {doneToday.length} note{doneToday.length === 1 ? '' : 's'}, {doneIn(doneToday.map((i) => i.sortedAt!))}.
            </AppText>
          </View>
          <Card style={{ marginTop: 24 }}>
            <SummaryRow icon="completed" bg={c.tint} fg={c.accentText} label="Became tasks" n={summary.tasks} />
            <SummaryRow icon="note" bg={c.ground} fg={c.textSecondary} label="Went to Notes" n={summary.notes} />
            <SummaryRow icon="trash" bg={c.dangerTint} fg={c.dangerText} label="Deleted" n={summary.deleted} last />
          </Card>
          <View style={{ paddingHorizontal: size.sideMargin, paddingTop: 28, gap: 10 }}>
            <PressScale accessibilityRole="button" onPress={() => goMain('/')} style={{ minHeight: 58, borderRadius: radius.button, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <AppText variant="button" tone="onAccent">
                Go to Today
              </AppText>
            </PressScale>
            <PressScale accessibilityRole="button" onPress={() => sheets.open(() => <UndoSortingSheet />)} style={{ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <AppText tone="secondary" style={{ ...font(700), fontSize: 15 }}>
                Undo sorting
              </AppText>
            </PressScale>
          </View>
        </>
      ) : (
        <View style={{ paddingTop: 22 }}>
          <EmptyState icon="inboxTray" title="Inbox zero" text="Nothing waiting. Dump a thought above and sort it later." />
        </View>
      )}
    </MainScroll>
  );
}

function SummaryRow({ icon, bg, fg, label, n, last }: { icon: IconName; bg: string; fg: string; label: string; n: number; last?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 8, paddingHorizontal: 20, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.ground }}>
      <View aria-hidden style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={fg} />
      </View>
      <AppText style={{ ...font(600), fontSize: 15 }}>{label}</AppText>
      <AppText style={{ marginLeft: 'auto', ...font(800), fontSize: 15, fontVariant: ['tabular-nums'] }}>{n}</AppText>
    </View>
  );
}

const SORT_PICKS: TimeKey[] = ['12:00', '18:00', '21:00'];

/** NSetupSort: "Want a nudge to sort these?" → NSortReminderOn snackbar with Undo. */
function SortOffer() {
  const { c } = useTheme();
  const snack = useSnackbar();
  const [pick, setPick] = useState<TimeKey>('18:00');
  return (
    <View accessibilityLabel="Sort reminder" style={{ marginTop: 22, marginHorizontal: size.sideMargin, backgroundColor: c.card, borderRadius: 22, padding: 20, gap: 16, borderWidth: 2, borderColor: c.tint }}>
      <View>
        <AppText style={{ ...font(800), fontSize: 17, lineHeight: 22 }}>Want a nudge to sort these?</AppText>
        <AppText tone="secondary" style={{ fontSize: 14, lineHeight: 21, marginTop: 6 }}>
          Once a day, only when something is waiting. Takes about a minute.
        </AppText>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Reminder time" style={{ flexDirection: 'row', gap: 8 }}>
        {SORT_PICKS.map((t) => {
          const on = t === pick;
          return (
            <PressScale
              key={t}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setPick(t)}
              style={{ flex: 1, minHeight: 44, borderRadius: 13, backgroundColor: on ? c.accent : c.ground, alignItems: 'center', justifyContent: 'center' }}
            >
              <AppText style={{ ...font(700), fontSize: 15, color: on ? c.onAccent : c.textSecondary, fontVariant: ['tabular-nums'] }}>{formatTime(t)}</AppText>
            </PressScale>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PressScale
          accessibilityRole="button"
          onPress={() => {
            useSettings.getState().set({ sortTime: pick });
            useLocal.setState({ sortOffered: true });
            snack({
              title: `Reminder set for ${formatTime(pick)}`,
              actions: [
                {
                  label: 'Undo',
                  onPress: () => {
                    useSettings.getState().set({ sortTime: null });
                    useLocal.setState({ sortOffered: false });
                  },
                },
              ],
            });
          }}
          style={{ flex: 1, minHeight: 50, borderRadius: 16, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText style={{ ...font(800), fontSize: 15, color: c.onAccent }}>{`Remind me at ${formatTime(pick)}`}</AppText>
        </PressScale>
        <PressScale
          accessibilityRole="button"
          onPress={() => useLocal.setState({ sortOffered: true })}
          style={{ minHeight: 50, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText tone="secondary" style={{ ...font(700), fontSize: 15 }}>
            No thanks
          </AppText>
        </PressScale>
      </View>
    </View>
  );
}
