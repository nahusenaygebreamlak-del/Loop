import { randomUUID } from 'expo-crypto';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Check } from '@/components/Check';
import { GrowingInput } from '@/components/GrowingInput';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useSheets } from '@/components/Sheet';
import { IconButton } from '@/components/ui';
import { goBack } from '@/features/nav';
import { NoteMenuSheet } from '@/features/sheets/NoteMenuSheet';
import { isEmptyNote } from '@/lib/inboxViews';
import { useStore } from '@/store/store';
import type { NoteBlock, NoteBlockType } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';
import { font } from '@/theme/typography';

const block = (type: NoteBlockType = 'text', text = ''): NoteBlock => ({ id: randomUUID(), type, text, ...(type === 'checklist' ? { done: false } : {}) });

/** NNoteEditor */
export default function NoteEditorRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NoteEditor key={id} id={id} />;
}

function NoteEditor({ id }: { id: string }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const note = useStore((s) => s.notes.find((n) => n.id === id && !n.deletedAt));
  const updateNote = useStore((s) => s.updateNote);
  const discardNote = useStore((s) => s.discardNote);

  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState<NoteBlock[]>(note?.body.length ? note.body : [block()]);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastFocus, setLastFocus] = useState<string | null>(null);
  // A line to focus after the next render (a new line after Enter, or the line above after Backspace).
  const pendingFocus = useRef<string | null>(null);
  const setFocusId = (blockId: string | null) => (pendingFocus.current = blockId);
  const refs = useRef(new Map<string, TextInputInstance>());
  const latest = useRef({ title, body });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const n = useStore.getState().notes.find((x) => x.id === id);
    if (!n) return;
    const { title: t, body: b } = latest.current;
    if (t !== n.title || JSON.stringify(b) !== JSON.stringify(n.body)) updateNote(id, { title: t, body: b });
  }, [id, updateNote]);

  // Save shortly after typing stops; on leaving, save or drop an empty note.
  const schedule = () => {
    setSaved('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      flush();
      setSaved('saved');
    }, 400);
  };
  useEffect(
    () => () => {
      flush();
      const n = useStore.getState().notes.find((x) => x.id === id);
      if (n && !n.deletedAt && isEmptyNote(n)) discardNote(id);
    },
    [flush, discardNote, id],
  );

  useEffect(() => {
    if (pendingFocus.current) {
      refs.current.get(pendingFocus.current)?.focus();
      pendingFocus.current = null;
    }
  });

  if (!note) return <View style={{ flex: 1, backgroundColor: c.card }} />;

  const change = (next: NoteBlock[]) => {
    latest.current = { ...latest.current, body: next };
    setBody(next);
    schedule();
  };

  const onText = (b: NoteBlock, text: string) => {
    const nl = text.indexOf('\n');
    if (nl < 0) return change(body.map((x) => (x.id === b.id ? { ...x, text } : x)));
    // Enter: an empty list item ends the list; otherwise split into a new block of the same kind.
    const before = text.slice(0, nl);
    const after = text.slice(nl + 1).replace(/\n/g, ' ');
    const i = body.findIndex((x) => x.id === b.id);
    if (!before.trim() && (b.type === 'checklist' || b.type === 'bullet')) {
      return change(body.map((x) => (x.id === b.id ? { id: x.id, type: 'text', text: after } : x)));
    }
    const fresh = block(b.type === 'heading' ? 'text' : b.type, after);
    change([...body.slice(0, i), { ...b, text: before }, fresh, ...body.slice(i + 1)]);
    setFocusId(fresh.id);
  };

  const onBackspace = (b: NoteBlock) => {
    if (b.text) return;
    const i = body.findIndex((x) => x.id === b.id);
    if (b.type !== 'text') return change(body.map((x) => (x.id === b.id ? { id: x.id, type: 'text', text: '' } : x)));
    if (i > 0) {
      change(body.filter((x) => x.id !== b.id));
      setFocusId(body[i - 1].id);
    }
  };

  // Toolbar acts on the line that had focus last (pressing a button blurs it on the web).
  const target = body.find((x) => x.id === lastFocus) ?? body[body.length - 1];
  const setType = (type: NoteBlockType) => {
    const nextType = target.type === type ? 'text' : type;
    change(body.map((x) => (x.id === target.id ? { id: x.id, type: nextType, text: x.text, bold: x.bold, ...(nextType === 'checklist' ? { done: false } : {}) } : x)));
    setFocusId(target.id);
  };
  const toggleBold = () => {
    change(body.map((x) => (x.id === target.id ? { ...x, bold: !x.bold } : x)));
    setFocusId(target.id);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.card }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 14 + insets.top, paddingHorizontal: 14, paddingBottom: 4 }}>
        <IconButton
          icon="back"
          label="Back to Notes"
          onPress={() => {
            flush();
            goBack();
          }}
        />
        <AppText tone="secondary" style={{ flex: 1, ...font(600), fontSize: 13 }} accessibilityLiveRegion="polite">
          {saved === 'saving' ? 'Saving…' : saved === 'saved' ? 'Saved · just now' : note.fromInbox ? 'From Inbox' : ''}
        </AppText>
        <IconButton icon="more" label="Note options" onPress={() => sheets.open(() => <NoteMenuSheet noteId={id} flush={flush} />)} />
        <PressScale
          accessibilityRole="button"
          onPress={() => {
            flush();
            goBack();
          }}
          style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.accent, justifyContent: 'center' }}
        >
          <AppText style={{ ...font(800), fontSize: 14, color: c.onAccent }}>Done</AppText>
        </PressScale>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 10, paddingHorizontal: size.sideMargin, paddingBottom: 40 }}>
        <GrowingInput
          value={title}
          onChangeText={(t) => {
            // Enter in the title moves to the first line of the note.
            if (t.includes('\n')) setFocusId(body[0]?.id ?? null);
            const clean = t.replace(/\n/g, '');
            latest.current = { ...latest.current, title: clean };
            setTitle(clean);
            schedule();
          }}
          autoFocus={!note.title && !note.body.length}
          submitBehavior="submit"
          onSubmitEditing={() => setFocusId(body[0]?.id ?? null)}
          placeholder="Title"
          placeholderTextColor={c.line}
          accessibilityLabel="Note title"
          style={{ padding: 0, ...font(800), fontSize: 26, lineHeight: 33, letterSpacing: -0.26, color: c.text }}
        />
        <View style={{ marginTop: 12 }}>
          {body.map((b, i) => (
            <BlockRow
              key={b.id}
              b={b}
              placeholder={i === 0 && body.length === 1 ? 'Write something' : undefined}
              inputRef={(r) => {
                if (r) refs.current.set(b.id, r);
                else refs.current.delete(b.id);
              }}
              onFocus={() => setLastFocus(b.id)}
              onText={(t) => onText(b, t)}
              onBackspace={() => onBackspace(b)}
              onToggle={() => change(body.map((x) => (x.id === b.id ? { ...x, done: !x.done } : x)))}
            />
          ))}
        </View>
      </ScrollView>

      <View
        accessibilityRole="toolbar"
        accessibilityLabel="Formatting"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, paddingBottom: 6 + insets.bottom, borderTopWidth: 1, borderTopColor: c.segmentTrack, backgroundColor: c.card }}
      >
        <Tool icon="checklist" label="Checklist" on={target.type === 'checklist'} onPress={() => setType('checklist')} />
        <Tool icon="bullets" label="Bulleted list" on={target.type === 'bullet'} onPress={() => setType('bullet')} />
        <Tool text="H" label="Heading" on={target.type === 'heading'} onPress={() => setType('heading')} />
        <Tool text="B" label="Bold" on={!!target.bold} onPress={toggleBold} />
        <View style={{ flex: 1 }} />
        <Tool icon="chevronDown" label="Hide keyboard" onPress={() => Keyboard.dismiss()} />
      </View>
    </KeyboardAvoidingView>
  );
}

function BlockRow({
  b,
  placeholder,
  inputRef,
  onFocus,
  onText,
  onBackspace,
  onToggle,
}: {
  b: NoteBlock;
  placeholder?: string;
  inputRef: (r: TextInputInstance | null) => void;
  onFocus: () => void;
  onText: (t: string) => void;
  onBackspace: () => void;
  onToggle: () => void;
}) {
  const { c } = useTheme();
  const heading = b.type === 'heading';
  const done = b.type === 'checklist' && !!b.done;
  const style = {
    flex: 1,
    padding: 0,
    paddingVertical: heading ? 6 : 4,
    color: done ? c.textSecondary : c.text,
    textDecorationLine: done ? ('line-through' as const) : ('none' as const),
    ...(heading ? { ...font(800), fontSize: 20, lineHeight: 27 } : { ...font(b.bold ? 800 : 500), fontSize: 16, lineHeight: 25 }),
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: b.type === 'checklist' ? 'center' : 'flex-start', gap: 6, minHeight: b.type === 'checklist' ? 46 : undefined }}>
      {b.type === 'checklist' ? (
        <View style={{ marginLeft: -10, marginRight: -4 }}>
          <Check done={done} label={b.text || 'Checklist item'} onToggle={onToggle} />
        </View>
      ) : null}
      {b.type === 'bullet' ? (
        <AppText aria-hidden style={{ ...font(800), fontSize: 16, lineHeight: 25, paddingVertical: 4, width: 14 }}>
          •
        </AppText>
      ) : null}
      <GrowingInput
        ref={inputRef}
        value={b.text}
        onChangeText={onText}
        onFocus={onFocus}
        onKeyPress={(e) => e.nativeEvent.key === 'Backspace' && onBackspace()}
        placeholder={placeholder ?? (b.type === 'checklist' ? 'Item' : undefined)}
        placeholderTextColor={c.line}
        accessibilityLabel={b.type === 'checklist' ? 'Checklist item' : b.type === 'heading' ? 'Heading' : b.type === 'bullet' ? 'Bullet' : 'Text'}
        style={style}
      />
    </View>
  );
}

function Tool({ icon, text, label, on, onPress }: { icon?: IconName; text?: string; label: string; on?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={on !== undefined ? { selected: on } : undefined}
      onPress={onPress}
      style={{ width: 48, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.tint : 'transparent' }}
    >
      {icon ? (
        <Icon name={icon} color={on ? c.accentText : c.text} />
      ) : (
        <AppText style={{ ...font(800), fontSize: 17, color: on ? c.accentText : c.text }}>{text}</AppText>
      )}
    </PressScale>
  );
}
