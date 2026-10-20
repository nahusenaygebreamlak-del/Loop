import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View, type TextInputInstance } from 'react-native';
import { create } from 'zustand';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { DateSheet, type DateValue } from '@/features/sheets/DateSheet';
import { UndoSortingSheet } from '@/features/sheets/UndoSortingSheet';
import { addDays, relativeDay, shortDate, type DateKey } from '@/lib/dates';
import { addedLine, endOfWeek, inboxOpen, sortedToday, sortSummary, stampShort } from '@/lib/inboxViews';
import { liveLists } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { Kbd } from '../Kbd';
import { useDeskState } from '../state';
import { DeskCard, DeskEmpty, DeskHeader, DeskPage, GroupLab } from '../ui';
import { useViewKeys } from '../useDeskKeys';

const webInput = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;
type WhenKind = 'today' | 'tomorrow' | 'week' | 'pick';
const plain = (dueDate: string): DateValue => ({ dueDate, startTime: null, endTime: null, reminderMinutes: null, repeatRule: null });

// One sorting run: the queue is fixed when it starts; each note's outcome is shown in the list.
type Session = { queue: string[]; at: number; outcomes: Record<string, string>; when: { kind: WhenKind; date: DateValue } | null; listId: string | null };
const useSession = create<Session>(() => ({ queue: [], at: 0, outcomes: {}, when: null, listId: null }));

const start = (fromId?: string) => {
  const ids = inboxOpen(useStore.getState().inbox).map((i) => i.id);
  const queue = fromId && ids.includes(fromId) ? [fromId, ...ids.filter((x) => x !== fromId)] : ids;
  useSession.setState({ queue, at: 0, outcomes: {}, when: null, listId: null });
  useDeskState.setState({ selected: queue[0] ? { kind: 'sort', id: queue[0] } : null });
};
const stop = () => {
  useSession.setState({ queue: [], at: 0, when: null, listId: null });
  useDeskState.setState({ selected: null });
};
const waiting = (id: string) => useStore.getState().inbox.some((i) => i.id === id && !i.sortedAt && !i.deletedAt);
const advance = () => {
  const s = useSession.getState();
  const next = s.queue.findIndex((id, i) => i > s.at && waiting(id));
  if (next < 0) return stop();
  useSession.setState({ at: next, when: null, listId: null });
  useDeskState.setState({ selected: { kind: 'sort', id: s.queue[next] } });
};

/** WInbox / WInboxEmpty: dump a thought, the notes (sorted ones greyed), sorting in the panel. */
export function InboxDesk() {
  const { c } = useTheme();
  const sheets = useSheets();
  const snack = useSnackbar();
  const { today } = useToday();
  const inbox = useStore((s) => s.inbox);
  const session = useSession();
  const focusDump = useDeskState((s) => s.focusDump);
  const [dump, setDump] = useState('');
  const field = useRef<TextInputInstance>(null);
  const open = inboxOpen(inbox);
  const sorting = session.queue.length > 0;

  // Opening the Inbox with notes starts sorting at the first one (WInbox).
  useEffect(() => {
    if (!useSession.getState().queue.length && inboxOpen(useStore.getState().inbox).length) start();
    return () => {
      if (useDeskState.getState().selected?.kind === 'sort') stop();
    };
  }, []);
  useEffect(() => {
    if (focusDump) setTimeout(() => field.current?.focus(), 30);
  }, [focusDump]);

  const save = () => {
    const t = dump.trim();
    if (!t) return;
    const id = useStore.getState().addInboxItem(t);
    setDump('');
    if (sorting) useSession.setState((s) => ({ queue: [...s.queue, id] }));
    else start();
    snack({ title: 'Saved to Inbox', sub: t, actions: [{ label: 'Undo', onPress: () => useStore.getState().removeInboxItem(id) }] });
  };

  const rows = sorting ? session.queue.map((id) => inbox.find((i) => i.id === id)).filter((x): x is NonNullable<typeof x> => !!x) : open;
  const doneToday = sortedToday(inbox, today);
  const summary = sortSummary(doneToday);
  const position = sorting ? Math.min(session.at + 1, session.queue.length) : 0;

  return (
    <DeskPage>
      <DeskHeader pre="Notes to sort later" title="Inbox" />
      <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingLeft: 18, paddingRight: 14, backgroundColor: c.card, borderRadius: 16 }}>
        <Icon name="plus" size={20} color={c.accentText} />
        <TextInput
          ref={field}
          value={dump}
          onChangeText={setDump}
          onSubmitEditing={save}
          submitBehavior="blurAndSubmit"
          placeholder="Dump a thought"
          placeholderTextColor={c.textSecondary}
          accessibilityLabel="Dump a thought"
          style={[{ flex: 1, minWidth: 0, fontSize: 15, color: c.text }, webInput]}
        />
        <Kbd k="N" />
      </View>

      {rows.length ? (
        <>
          <GroupLab first>{sorting ? `Sorting · ${position} of ${session.queue.length}` : `${open.length} to sort`}</GroupLab>
          <DeskCard>
            {rows.map((i, n) => {
              const outcome = session.outcomes[i.id];
              const current = sorting && session.queue[session.at] === i.id && !outcome;
              return (
                <Pressable
                  key={i.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: current }}
                  onPress={() => {
                    if (outcome) return;
                    if (!sorting) return start(i.id);
                    useSession.setState({ at: session.queue.indexOf(i.id), when: null, listId: null });
                    useDeskState.setState({ selected: { kind: 'sort', id: i.id } });
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6, paddingLeft: 18, paddingRight: 10, borderBottomWidth: n < rows.length - 1 ? 1 : 0, borderBottomColor: c.ground, backgroundColor: current ? c.tint : 'transparent' }}
                >
                  {outcome ? (
                    <Icon name="check" size={18} color={c.line} />
                  ) : current ? (
                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 5, borderColor: c.accent }} />
                  ) : (
                    <View style={{ width: 18 }} />
                  )}
                  <View style={{ flex: 1 }}>
                    <AppText numberOfLines={1} style={{ ...font(outcome ? 600 : 700), fontSize: 15, color: outcome ? c.textSecondary : c.text }}>
                      {i.text}
                    </AppText>
                    <AppText tone="secondary" style={{ fontSize: 12.5, marginTop: 2 }}>
                      {outcome ?? stampShort(i.createdAt, today)}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </DeskCard>
        </>
      ) : (
        <DeskEmpty
          tick
          title="Inbox is clear"
          text={
            doneToday.length
              ? `${doneToday.length} note${doneToday.length === 1 ? '' : 's'} sorted: ${summary.tasks} task${summary.tasks === 1 ? '' : 's'}, ${summary.notes} kept as a note, ${summary.deleted} deleted.`
              : 'Nothing waiting. Dump a thought above and sort it later.'
          }
        >
          {doneToday.length ? (
            <Pressable accessibilityRole="button" onPress={() => sheets.open(() => <UndoSortingSheet />)}>
              <AppText style={{ ...font(700), fontSize: 13.5, color: c.accentText }}>Undo sorting</AppText>
            </Pressable>
          ) : null}
        </DeskEmpty>
      )}
    </DeskPage>
  );
}

/** The sorting card in the panel (WInbox), or "Nothing to sort" (WInboxEmpty). */
export function SortPanel({ id }: { id: string }) {
  const { c } = useTheme();
  const sheets = useSheets();
  const snack = useSnackbar();
  const { today } = useToday();
  const weekStart = useSettings((s) => s.weekStart);
  const item = useStore((s) => s.inbox.find((i) => i.id === id));
  const lists = liveLists(useStore((s) => s.lists));
  const session = useSession();
  const total = session.queue.length;
  const pos = session.at + 1;
  const when = session.when;
  const list = lists.find((l) => l.id === session.listId);

  const pick = (kind: WhenKind) => {
    if (kind === 'today') useSession.setState({ when: { kind, date: plain(today) } });
    if (kind === 'tomorrow') useSession.setState({ when: { kind, date: plain(addDays(today, 1)) } });
    if (kind === 'week') useSession.setState({ when: { kind, date: plain(endOfWeek(today, weekStart) as DateKey) } });
    if (kind === 'pick') sheets.open(() => <DateSheet value={when?.date ?? plain(addDays(today, 2))} onChange={(v) => v.dueDate && useSession.setState({ when: { kind: 'pick', date: v } })} />);
  };
  const whenLabel = when ? (when.kind === 'week' ? 'This week' : when.kind === 'pick' ? shortDate(when.date.dueDate!) : relativeDay(when.date.dueDate!, today)) : null;
  const mark = (label: string) => useSession.setState((s) => ({ outcomes: { ...s.outcomes, [id]: label } }));
  const add = () => {
    if (!item || !when) return;
    useStore.getState().sortInbox(item.id, 'task', { title: item.text, listId: session.listId, ...when.date });
    mark(['Task', whenLabel, list?.name].filter(Boolean).join(' · '));
    advance();
  };
  const keep = () => {
    if (!item) return;
    const noteId = useStore.getState().sortInbox(item.id, 'note');
    mark('Kept as a note');
    snack({ title: 'Moved to Notes', sub: item.text, actions: [{ label: 'Undo', onPress: () => useStore.getState().unsortInbox(item.id) }] });
    advance();
    void noteId;
  };
  const del = () => {
    if (!item) return;
    useStore.getState().sortInbox(item.id, 'deleted');
    mark('Deleted');
    snack({ title: 'Deleted', sub: item.text, actions: [{ label: 'Undo', onPress: () => useStore.getState().unsortInbox(item.id) }] });
    advance();
  };

  useViewKeys((k) => {
    if (k === 't') return pick('today'), true;
    if (k === 'm') return pick('tomorrow'), true;
    if (k === 'w') return pick('week'), true;
    if (k === 'd') return pick('pick'), true;
    if (/^[1-9]$/.test(k) && lists[Number(k) - 1]) return useSession.setState({ listId: lists[Number(k) - 1].id }), true;
    if (k === 'n') return keep(), true;
    if (k === 's') return advance(), true;
    if (k === 'Delete' || k === 'Backspace') return del(), true;
    if (k === 'Enter') return add(), true;
    if (k === 'Escape') return stop(), true;
    return false;
  });

  if (!item || item.sortedAt) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <AppText style={{ ...font(800), fontSize: 17 }}>Nothing to sort</AppText>
        <AppText tone="secondary" style={{ fontSize: 14, lineHeight: 21, maxWidth: 280, textAlign: 'center' }}>
          Press N anywhere to dump a thought. Sort it later, here or from the evening reminder on your phone.
        </AppText>
      </View>
    );
  }

  const chip = (label: string, on: boolean, k: string, onPress: () => void, sw?: string) => (
    <Pressable
      key={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 42, paddingHorizontal: 16, borderRadius: 14, backgroundColor: on ? c.accent : c.ground }}
    >
      {sw ? <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: on ? '#FFFFFF' : sw }} /> : null}
      <AppText style={{ ...font(700), fontSize: 14.5, color: on ? c.onAccent : c.text }}>{label}</AppText>
      <Kbd k={k} onAccent={on} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View accessibilityRole="progressbar" accessibilityLabel={`Note ${pos} of ${total}`} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.tint }}>
          <View style={{ width: `${(pos / Math.max(1, total)) * 100}%`, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
        </View>
        <AppText tone="secondary" style={{ ...font(700), fontSize: 13 }}>{`${pos} of ${total}`}</AppText>
        <Pressable accessibilityRole="button" onPress={stop} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText tone="secondary" style={{ ...font(700), fontSize: 13 }}>
            Stop
          </AppText>
          <Kbd k="Esc" />
        </Pressable>
      </View>
      <View>
        <AppText tone="secondary" style={{ ...font(600), fontSize: 12.5 }}>
          {addedLine(item.createdAt, today)}
        </AppText>
        <AppText accessibilityRole="header" style={{ marginTop: 6, ...font(800), fontSize: 24, lineHeight: 30 }}>
          {item.text}
        </AppText>
      </View>
      <View>
        <AppText style={{ ...font(700), fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', color: c.textSecondary, marginBottom: 10 }}>When?</AppText>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {chip('Today', when?.kind === 'today', 'T', () => pick('today'))}
          {chip('Tomorrow', when?.kind === 'tomorrow', 'M', () => pick('tomorrow'))}
          {chip('This week', when?.kind === 'week', 'W', () => pick('week'))}
          {chip(when?.kind === 'pick' ? shortDate(when.date.dueDate!) : 'Pick date', when?.kind === 'pick', 'D', () => pick('pick'))}
        </View>
      </View>
      <View>
        <AppText style={{ ...font(700), fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', color: c.textSecondary, marginBottom: 10 }}>Which list?</AppText>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {lists.slice(0, 9).map((l, i) => chip(l.name, session.listId === l.id, String(i + 1), () => useSession.setState({ listId: session.listId === l.id ? null : l.id }), listColors[l.color]))}
        </View>
      </View>
      <View style={{ flex: 1 }} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !when }}
        disabled={!when}
        onPress={add}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 56, borderRadius: 18, backgroundColor: when ? c.accent : c.line }}
      >
        <AppText style={{ ...font(800), fontSize: 16, color: c.onAccent }}>{when ? `Add to ${[whenLabel, list?.name].filter(Boolean).join(' · ')}` : 'Pick when first'}</AppText>
        <Kbd k="Enter" onAccent />
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable accessibilityRole="button" onPress={keep} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 16, backgroundColor: c.ground }}>
          <AppText style={{ ...font(700), fontSize: 14 }}>Keep as note</AppText>
          <Kbd k="N" />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={del} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 16, backgroundColor: c.ground }}>
          <AppText style={{ ...font(700), fontSize: 14, color: c.dangerText }}>Delete</AppText>
          <Kbd k="Del" />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={advance} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.ground }}>
          <AppText tone="secondary" style={{ ...font(700), fontSize: 14 }}>
            Skip
          </AppText>
          <Kbd k="S" />
        </Pressable>
      </View>
    </View>
  );
}
