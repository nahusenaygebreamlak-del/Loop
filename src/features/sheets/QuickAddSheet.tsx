import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet, useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { Swatch } from '@/components/ui';
import { relativeDay, relativeDayInSentence, timeRange, todayKey } from '@/lib/dates';
import { parseQuickAdd, type Priority } from '@/lib/parse';
import { PRIORITY_LABEL } from '@/lib/taskViews';
import { useStore } from '@/store/store';
import type { List } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { goMain } from '../nav';
import { DateSheet, type DateValue } from './DateSheet';
import { ListSheet } from './ListSheet';
import { PrioritySheet } from './PrioritySheet';
import { TagsSheet } from './TagsSheet';

type Overrides = { date?: DateValue; priority?: Priority; listId?: string | null; tagIds?: string[] };

const TITLE = { ...font(700), fontSize: 20, lineHeight: 29 };
// Web textareas default to two rows; start at one like the native field.
const WEB_ONE_ROW = Platform.OS === 'web' ? ({ rows: 1 } as object) : {};

function findList(lists: List[], name: string | null): List | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();
  const live = lists.filter((l) => !l.deletedAt && !l.archivedAt);
  return live.find((l) => l.name.toLowerCase() === n) ?? live.find((l) => l.name.toLowerCase().startsWith(n));
}

/**
 * VQuickAdd / NQuickAddInbox. Presets: `listId` from a list screen, `date` from a day in Next 7 Days,
 * `initialText` from a tag view ("#design ").
 */
export function QuickAddSheet({ listId: presetList, date: presetDate, initialText = '' }: { listId?: string | null; date?: string; initialText?: string }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const sheets = useSheets();
  const snack = useSnackbar();
  const lists = useStore((s) => s.lists);
  const tags = useStore((s) => s.tags);
  const store = useStore.getState;
  const inputRef = useRef<TextInputInstance>(null);

  const [text, setText] = useState(initialText);
  const [notes, setNotes] = useState('');
  const [o, setO] = useState<Overrides>(() => ({
    ...(presetList ? { listId: presetList } : {}),
    ...(presetDate ? { date: { dueDate: presetDate, startTime: null, endTime: null, reminderMinutes: null, repeatRule: null } } : {}),
  }));

  const today = todayKey();
  const parsed = useMemo(() => parseQuickAdd(text), [text]);

  // Typed tokens fill the chips; a chip set by tapping wins over typing.
  const date: DateValue = o.date ?? {
    dueDate: parsed.date,
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    reminderMinutes: null,
    repeatRule: null,
  };
  const priority: Priority = o.priority ?? parsed.priority ?? 0;
  // ~list picks a list; a #tag that is exactly a list's name ("#personal") also files it there, as in VQuickAdd.
  const typedList =
    findList(lists, parsed.list) ?? lists.find((l) => !l.deletedAt && !l.archivedAt && parsed.tags.includes(l.name.toLowerCase()));
  const listId = o.listId !== undefined ? o.listId : (typedList?.id ?? null);
  const list = lists.find((l) => l.id === listId);
  const tagIds = o.tagIds ?? [];
  const tagLabel = [...parsed.tags, ...tagIds.map((id) => tags.find((t) => t.id === id)?.name).filter((n): n is string => !!n && !parsed.tags.includes(n))]
    .map((t) => `#${t}`)
    .join(' ');

  const title = parsed.title;
  const toInbox = !date.dueDate && !listId;
  const canSave = title.length > 0;

  const save = () => {
    if (!canSave) return;
    if (toInbox) {
      const id = store().addInboxItem(text.trim());
      close();
      snack({
        title: 'Saved to Inbox',
        sub: text.trim(),
        actions: [
          { label: 'Open', onPress: () => goMain('/inbox') },
          { label: 'Undo', onPress: () => store().removeInboxItem(id) },
        ],
      });
      return;
    }
    const allTags = [...new Set([...parsed.tags.map((t) => store().ensureTag(t)), ...tagIds])];
    const id = store().addTask({ title, notes: notes.trim(), listId, priority, tagIds: allTags, ...date });
    close();
    const when = date.dueDate ? `Added for ${relativeDayInSentence(date.dueDate, today)}${date.startTime ? `, ${timeRange(date.startTime, date.endTime)}` : ''}` : `Added to ${list?.name}`;
    snack({
      title: when,
      sub: [title, list?.name].filter(Boolean).join(' · '),
      actions: [
        { label: 'View', onPress: () => router.push({ pathname: '/task/[id]', params: { id } }) },
        { label: 'Undo', onPress: () => store().discardTask(id) },
      ],
    });
  };

  // Highlighted copy of the text, drawn under a transparent input (the typed tokens get a tint).
  const highlighted = useMemo(() => {
    const parts: { t: string; tok: boolean }[] = [];
    let i = 0;
    for (const sp of parsed.spans) {
      if (sp.start > i) parts.push({ t: text.slice(i, sp.start), tok: false });
      parts.push({ t: text.slice(sp.start, sp.end), tok: true });
      i = sp.end;
    }
    if (i < text.length) parts.push({ t: text.slice(i), tok: false });
    return parts;
  }, [parsed.spans, text]);

  const dateLabel = date.dueDate ? relativeDay(date.dueDate, today) + (date.startTime ? `, ${timeRange(date.startTime, date.endTime)}` : '') : null;

  return (
    <SheetCard label="Add task" gap={18} style={{ paddingBottom: 20 }}>
      <View>
        <AppText style={[TITLE, styles.layer]} aria-hidden>
          {highlighted.map((p, i) =>
            p.tok ? (
              <AppText key={i} style={[TITLE, { color: c.accentText, backgroundColor: c.tint }]}>
                {p.t}
              </AppText>
            ) : (
              <AppText key={i} style={[TITLE, { color: c.text }]}>
                {p.t}
              </AppText>
            ),
          )}
        </AppText>
        <TextInput
          ref={inputRef}
          autoFocus
          multiline
          {...WEB_ONE_ROW}
          value={text}
          onChangeText={(t) => setText(t.replace(/\n/g, ''))}
          onSubmitEditing={save}
          submitBehavior="submit"
          onKeyPress={(e) => {
            // Web textareas don't fire onSubmitEditing on Enter.
            if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
              (e as unknown as { preventDefault: () => void }).preventDefault();
              save();
            }
          }}
          returnKeyType="done"
          placeholder="Add a task or dump a note"
          placeholderTextColor={c.textSecondary}
          accessibilityLabel="Task"
          accessibilityHint="Type dates, #tags, !priority, ~list"
          cursorColor={c.accent}
          selectionColor={c.accent}
          style={[TITLE, styles.input, { color: text ? 'transparent' : c.text, ...(Platform.OS === 'web' ? ({ caretColor: c.accent, outlineStyle: 'none' } as object) : null) }]}
        />
      </View>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Add a description"
        placeholderTextColor={c.textSecondary}
        accessibilityLabel="Description"
        multiline
        {...WEB_ONE_ROW}
        style={[{ fontSize: 15, color: c.text, padding: 0, ...font(500) }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
      />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Chip
          icon="calendar"
          label={dateLabel ?? 'Date'}
          set={!!dateLabel}
          onPress={() => sheets.open(() => <DateSheet value={date} onChange={(v) => setO((s) => ({ ...s, date: v }))} />)}
        />
        <Chip
          icon="flag"
          label={priority ? PRIORITY_LABEL[priority] : 'Priority'}
          set={!!priority}
          danger={priority === 3}
          onPress={() => sheets.open(() => <PrioritySheet value={priority} onChange={(p) => setO((s) => ({ ...s, priority: p }))} />)}
        />
        <Chip
          label={tagLabel || '# Tag'}
          set={!!tagLabel}
          onPress={() => sheets.open(() => <TagsSheet value={tagIds} onChange={(ids) => setO((s) => ({ ...s, tagIds: ids }))} />)}
        />
        <Chip
          icon={list ? undefined : 'listPlain'}
          swatch={list ? listColors[list.color] : undefined}
          label={list?.name ?? 'List'}
          onPress={() => sheets.open(() => <ListSheet value={listId} onChange={(id) => setO((s) => ({ ...s, listId: id }))} />)}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {toInbox && canSave ? (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="inboxTray" size={20} color={c.textSecondary} />
            <AppText tone="secondary" style={{ fontSize: 13.5, flexShrink: 1 }}>
              No date or list, so it goes to Inbox
            </AppText>
          </View>
        ) : (
          <AppText tone="secondary" style={{ fontSize: 13.5, flex: 1 }}>
            Type dates, #tags, !priority, ~list
          </AppText>
        )}
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={toInbox ? 'Save to Inbox' : 'Add task'}
          accessibilityState={{ disabled: !canSave }}
          disabled={!canSave}
          onPress={save}
          style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: canSave ? 1 : 0.5 }}
        >
          <Icon name="arrowRight" strokeWidth={2.4} color={c.onAccent} />
        </PressScale>
      </View>
    </SheetCard>
  );
}

function Chip({ icon, swatch, label, set, danger, onPress }: { icon?: IconName; swatch?: string; label: string; set?: boolean; danger?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const bg = danger ? c.dangerTint : set ? c.tint : c.ground;
  const fg = danger ? c.dangerText : set ? c.accentText : c.text;
  return (
    <PressScale
      accessibilityRole="button"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: bg }}
    >
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
      {swatch ? <Swatch color={swatch} size={10} /> : null}
      <AppText style={{ ...font(600), fontSize: 14, color: fg }}>{label}</AppText>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, top: 0 },
  input: { padding: 0, margin: 0, textAlignVertical: 'top', includeFontPadding: false, minHeight: 29 },
});
