import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { goBack } from '@/features/nav';
import { DateSheet, type DateValue } from '@/features/sheets/DateSheet';
import { addDays, relativeDay, shortDate } from '@/lib/dates';
import { addedLine, endOfWeek, inboxOpen } from '@/lib/inboxViews';
import { liveLists } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { easingCurve, listColors, motion, radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

type When = { kind: 'today' | 'tomorrow' | 'week' | 'pick'; date: DateValue };
const plainDate = (dueDate: string): DateValue => ({ dueDate, startTime: null, endTime: null, reminderMinutes: null, repeatRule: null });

/** NSortNote / NSortNoteSet / NMovedToNotes: one Inbox note at a time. */
export default function SortInbox() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const snack = useSnackbar();
  const { today } = useToday();
  const weekStart = useSettings((s) => s.weekStart);
  const inbox = useStore((s) => s.inbox);
  const lists = liveLists(useStore((s) => s.lists));
  const sortInbox = useStore((s) => s.sortInbox);
  const unsortInbox = useStore((s) => s.unsortInbox);
  const updateInboxItem = useStore((s) => s.updateInboxItem);

  // The queue is fixed when sorting starts: the tapped note first, then the rest as listed.
  const [queue] = useState(() => {
    const ids = inboxOpen(useStore.getState().inbox).map((i) => i.id);
    return start && ids.includes(start) ? [start, ...ids.filter((x) => x !== start)] : ids;
  });
  const [index, setIndex] = useState(0);
  const [when, setWhen] = useState<When | null>(null);
  const [listId, setListId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<{ id: string; text: string } | null>(null);

  // The current note is the next one in the queue that hasn't been sorted (here or elsewhere).
  const isWaiting = (qid: string) => inbox.some((i) => i.id === qid && !i.sortedAt && !i.deletedAt);
  const cur = queue.findIndex((qid, i) => i >= index && isWaiting(qid));
  const item = cur >= 0 ? inbox.find((i) => i.id === queue[cur]) : undefined;
  const text = edit && item && edit.id === item.id ? edit.text : (item?.text ?? '');
  const setText = (t: string) => item && setEdit({ id: item.id, text: t });

  const finish = () => goBack();
  useEffect(() => {
    if (cur < 0) goBack();
  }, [cur]);

  const next = () => {
    setWhen(null);
    setListId(null);
    setEditing(false);
    setEdit(null);
    setIndex(cur + 1);
  };

  const progress = queue.length ? (Math.max(cur, 0) + 1) / queue.length : 1;
  const reduced = useReducedMotion();
  const fill = useSharedValue(reduced ? progress : 0.2);
  useEffect(() => {
    fill.set(reduced ? progress : withTiming(progress, { duration: motion.progressFill.duration, easing: Easing.bezier(...easingCurve) }));
  }, [progress, reduced, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  if (!item) return <View style={{ flex: 1, backgroundColor: c.ground }} />;

  const saveText = () => {
    setEditing(false);
    if (text.trim() && text.trim() !== item.text) updateInboxItem(item.id, text.trim());
  };
  const pick = (kind: When['kind']) => {
    if (kind === 'today') setWhen({ kind, date: plainDate(today) });
    if (kind === 'tomorrow') setWhen({ kind, date: plainDate(addDays(today, 1)) });
    if (kind === 'week') setWhen({ kind, date: plainDate(endOfWeek(today, weekStart)) });
    if (kind === 'pick')
      sheets.open(() => <DateSheet value={when?.date ?? plainDate(addDays(today, 2))} onChange={(v) => v.dueDate && setWhen({ kind: 'pick', date: v })} />);
  };

  const whenLabel = when ? (when.kind === 'week' ? 'This week' : when.kind === 'pick' ? shortDate(when.date.dueDate!) : relativeDay(when.date.dueDate!, today)) : null;
  const list = lists.find((l) => l.id === listId);

  const addTask = () => {
    if (!when) return;
    saveText();
    sortInbox(item.id, 'task', { title: text.trim() || item.text, listId, ...when.date });
    next();
  };
  const keepAsNote = () => {
    saveText();
    const noteId = sortInbox(item.id, 'note');
    const at = cur;
    snack({
      title: 'Moved to Notes',
      sub: item.text,
      bottom: 236,
      actions: [
        { label: 'Open', onPress: () => noteId && router.push({ pathname: '/note/[id]', params: { id: noteId } }) },
        {
          label: 'Undo',
          onPress: () => {
            unsortInbox(item.id);
            setIndex(at);
          },
        },
      ],
    });
    next();
  };
  const remove = () => {
    sortInbox(item.id, 'deleted');
    next();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingTop: 14 + insets.top, paddingBottom: 28 + insets.bottom, paddingHorizontal: size.sideMargin }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <PressScale accessibilityRole="button" accessibilityLabel="Stop sorting" onPress={finish} style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" color={c.text} />
          </PressScale>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`Note ${cur + 1} of ${queue.length}`}
            accessibilityValue={{ min: 1, max: queue.length, now: cur + 1 }}
            style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.tint, overflow: 'hidden' }}
          >
            <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: c.accent }, fillStyle]} />
          </View>
          <AppText tone="secondary" style={{ ...font(700), fontSize: 14, fontVariant: ['tabular-nums'] }}>
            {cur + 1} of {queue.length}
          </AppText>
        </View>

        <View style={{ marginTop: 20, backgroundColor: c.card, borderRadius: 22, paddingVertical: 22, paddingHorizontal: 20 }}>
          <AppText tone="secondary" style={{ ...font(600), fontSize: 13 }}>
            {addedLine(item.createdAt, today)}
          </AppText>
          {editing ? (
            <TextInput
              autoFocus
              multiline
              value={text}
              onChangeText={setText}
              onBlur={saveText}
              accessibilityLabel="Note text"
              style={[{ marginTop: 8, padding: 0, ...font(800), fontSize: 22, lineHeight: 29, color: c.text }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
            />
          ) : (
            <AppText accessibilityRole="header" style={{ marginTop: 8, ...font(800), fontSize: 22, lineHeight: 29 }}>
              {item.text}
            </AppText>
          )}
          <PressScale accessibilityRole="button" onPress={() => (editing ? saveText() : setEditing(true))} style={{ marginTop: 6, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <AppText tone="accent" style={{ ...font(700), fontSize: 14 }}>
              {editing ? 'Done editing' : 'Edit text'}
            </AppText>
          </PressScale>
        </View>

        <Question label="When?" style={{ marginTop: 24 }}>
          <Opt label="Today" on={when?.kind === 'today'} onPress={() => pick('today')} />
          <Opt label="Tomorrow" on={when?.kind === 'tomorrow'} onPress={() => pick('tomorrow')} />
          <Opt label="This week" on={when?.kind === 'week'} onPress={() => pick('week')} />
          <Opt icon="calendar" label={when?.kind === 'pick' ? shortDate(when.date.dueDate!) : 'Pick date'} on={when?.kind === 'pick'} onPress={() => pick('pick')} />
        </Question>
        <Question label="Which list?" style={{ marginTop: 22 }}>
          {lists.map((l) => (
            <Opt key={l.id} swatch={listColors[l.color]} label={l.name} on={listId === l.id} onPress={() => setListId(listId === l.id ? null : l.id)} />
          ))}
        </Question>

        <View style={{ flex: 1, minHeight: 24 }} />
        <View style={{ gap: 10 }}>
          <PressScale
            accessibilityRole="button"
            accessibilityState={{ disabled: !when }}
            disabled={!when}
            onPress={addTask}
            style={{ minHeight: 58, borderRadius: radius.button, backgroundColor: when ? c.accent : c.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}
          >
            <AppText variant="button" tone="onAccent" numberOfLines={1}>
              {when ? `Add to ${whenLabel}${list ? ` · ${list.name}` : ''}` : 'Pick when to make it a task'}
            </AppText>
          </PressScale>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Alt icon="note" label="Keep as note" onPress={keepAsNote} />
            <Alt icon="trash" label="Delete" danger onPress={remove} />
          </View>
          <PressScale accessibilityRole="button" onPress={next} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <AppText tone="secondary" style={{ ...font(700), fontSize: 14.5 }}>
              Skip for now
            </AppText>
          </PressScale>
        </View>
      </ScrollView>
    </View>
  );
}

function Question({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={style}>
      <AppText tone="secondary" accessibilityRole="header" style={{ ...font(700), fontSize: 14, marginBottom: 10 }}>
        {label}
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel={label.replace('?', '')} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {children}
      </View>
    </View>
  );
}

function Opt({ label, on, onPress, icon, swatch }: { label: string; on: boolean; onPress: () => void; icon?: IconName; swatch?: string }) {
  const { c } = useTheme();
  const fg = on ? c.onAccent : c.text;
  return (
    <PressScale
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: on ? c.accent : c.card, flexDirection: 'row', alignItems: 'center', gap: 8 }}
    >
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
      {swatch ? <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: on ? '#FFFFFF' : swatch }} /> : null}
      <AppText style={{ ...font(700), fontSize: 14.5, color: fg }}>{label}</AppText>
    </PressScale>
  );
}

function Alt({ icon, label, danger, onPress }: { icon: IconName; label: string; danger?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const fg = danger ? c.dangerText : c.text;
  return (
    <PressScale
      accessibilityRole="button"
      onPress={onPress}
      style={{ flex: 1, minHeight: 50, borderRadius: 16, backgroundColor: c.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
    >
      <Icon name={icon} size={20} color={fg} />
      <AppText style={{ ...font(700), fontSize: 14.5, color: fg }}>{label}</AppText>
    </PressScale>
  );
}
