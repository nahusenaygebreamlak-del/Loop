import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { LoopMarkSvg } from '@/components/Brand';
import { PressScale } from '@/components/PressScale';
import { useSnackbar } from '@/components/Snackbar';
import { goMain } from '@/features/nav';
import { monthDay, relativeDay, relativeDayInSentence, timeRange, toKey, todayKey } from '@/lib/dates';
import { parseQuickAdd } from '@/lib/parse';
import { dueShort, highlightParts, PRIORITY_LABEL, search } from '@/lib/taskViews';
import { useLocal } from '@/store/local';
import { useStore } from '@/store/store';
import type { List } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { Kbd } from './Kbd';
import { closeOverlay, selectTask, useDeskState } from './state';

const webInput = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

/** The pop-up opens from a key press; focus its field once it's on screen. */
function useFocusSoon(ref: { current: TextInputInstance | null }) {
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [ref]);
}

/** Whichever pop-up is open: quick add, search, shortcuts, welcome. */
export function Overlays() {
  const overlay = useDeskState((s) => s.overlay);
  if (!overlay) return null;
  return (
    <Scrim top={overlay === 'shortcuts' ? 80 : overlay === 'welcome' ? 110 : 120}>
      {overlay === 'quick' ? <QuickBar /> : overlay === 'search' ? <SearchPop /> : overlay === 'shortcuts' ? <ShortcutsPop /> : <WelcomePop />}
    </Scrim>
  );
}

/** Centred near the top over a 32 % ink scrim (55 % black in dark); a click outside closes. */
function Scrim({ children, top }: { children: ReactNode; top: number }) {
  const { c } = useTheme();
  return (
    <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', paddingTop: top, paddingHorizontal: 16 }}>
      <Pressable accessibilityLabel="Close" onPress={closeOverlay} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: c.desk.scrim }} />
      {children}
    </View>
  );
}

function PopCard({ children, width = 640, label, style }: { children: ReactNode; width?: number; label: string; style?: object }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="dialog" accessibilityLabel={label} accessibilityViewIsModal style={[{ width, maxWidth: '100%', backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.desk.border }, style]}>
      {children}
    </View>
  );
}

function findList(lists: List[], name: string | null): List | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();
  const live = lists.filter((l) => !l.deletedAt && !l.archivedAt);
  return live.find((l) => l.name.toLowerCase() === n) ?? live.find((l) => l.name.toLowerCase().startsWith(n));
}

/** WQuickAdd: the Q command bar. Same parsing and chips as the phone. */
function QuickBar() {
  const { c } = useTheme();
  const snack = useSnackbar();
  const start = useDeskState.getState();
  const lists = useStore((s) => s.lists);
  const [text, setText] = useState(start.quickText);
  const [notes, setNotes] = useState('');
  const [describe, setDescribe] = useState(false);
  const field = useRef<TextInputInstance>(null);
  useFocusSoon(field);
  const parsed = useMemo(() => parseQuickAdd(text), [text]);
  const today = todayKey();
  const typedList = findList(lists, parsed.list) ?? lists.find((l) => !l.deletedAt && !l.archivedAt && parsed.tags.includes(l.name.toLowerCase()));
  const listId = typedList?.id ?? start.quickList;
  const list = lists.find((l) => l.id === listId);
  const dueDate = parsed.date ?? (parsed.startTime ? today : start.quickDate);
  const can = parsed.title.length > 0;

  const save = () => {
    if (!can) return;
    const s = useStore.getState();
    closeOverlay();
    if (!dueDate && !listId) {
      const id = s.addInboxItem(text.trim());
      snack({ title: 'Saved to Inbox', sub: text.trim(), actions: [{ label: 'Undo', onPress: () => useStore.getState().removeInboxItem(id) }] });
      return;
    }
    const tagIds = [...new Set(parsed.tags.map((t) => s.ensureTag(t)))];
    const id = s.addTask({ title: parsed.title, notes: notes.trim(), listId: listId ?? null, priority: parsed.priority ?? 0, tagIds, dueDate, startTime: parsed.startTime, endTime: parsed.endTime });
    selectTask(id);
    snack({
      title: dueDate ? `Added for ${relativeDayInSentence(dueDate, today)}${parsed.startTime ? `, ${timeRange(parsed.startTime, parsed.endTime)}` : ''}` : `Added to ${list?.name}`,
      actions: [{ label: 'Undo', onPress: () => useStore.getState().discardTask(id) }],
    });
  };

  const parts: { t: string; kind: string | null }[] = [];
  let i = 0;
  for (const sp of parsed.spans) {
    if (sp.start > i) parts.push({ t: text.slice(i, sp.start), kind: null });
    parts.push({ t: text.slice(sp.start, sp.end), kind: sp.kind });
    i = sp.end;
  }
  if (i < text.length) parts.push({ t: text.slice(i), kind: null });
  const tokStyle = (k: string | null) => (k === 'priority' ? { color: c.dangerText, backgroundColor: c.dangerTint } : k ? { color: c.accentText, backgroundColor: c.tint } : { color: c.text });
  const TITLE = { ...font(700), fontSize: 20, lineHeight: 29 };

  const chip = (label: string, tone: 'blue' | 'red' | 'grey', lead?: ReactNode) => (
    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 16, borderRadius: 14, backgroundColor: tone === 'blue' ? c.tint : tone === 'red' ? c.dangerTint : c.ground }}>
      {lead}
      <AppText style={{ ...font(700), fontSize: 13.5, color: tone === 'blue' ? c.accentText : tone === 'red' ? c.dangerText : c.text }}>{label}</AppText>
    </View>
  );

  return (
    <PopCard label="Add task" style={{ paddingTop: 20, paddingHorizontal: 22, paddingBottom: 16, gap: 14 }}>
      <View>
        <AppText aria-hidden numberOfLines={1} ellipsizeMode="clip" style={[TITLE, { position: 'absolute', top: 0, left: 0, right: 0 }]}>
          {parts.map((p, n) => (
            <Text key={n} style={[tokStyle(p.kind), p.kind ? { borderRadius: 6 } : null]}>
              {p.t}
            </Text>
          ))}
        </AppText>
        <TextInput
          ref={field}
          autoFocus
          value={text}
          onChangeText={setText}
          onKeyPress={(e) => {
            const ev = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
            if (ev.key === 'Enter' && ev.shiftKey) {
              (e as unknown as { preventDefault: () => void }).preventDefault();
              setDescribe(true);
            } else if (ev.key === 'Enter') {
              (e as unknown as { preventDefault: () => void }).preventDefault();
              save();
            }
          }}
          placeholder="Add a task or dump a note"
          placeholderTextColor={c.textSecondary}
          accessibilityLabel="Task"
          accessibilityHint="Type dates, #tags, !priority, ~list"
          style={[TITLE, { padding: 0, color: text ? 'transparent' : c.text }, webInput, Platform.OS === 'web' ? ({ caretColor: c.accent } as object) : null]}
        />
      </View>
      {describe ? (
        <TextInput
          autoFocus
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Description"
          placeholderTextColor={c.textSecondary}
          style={[{ minHeight: 60, fontSize: 15, color: c.text, padding: 12, borderRadius: 14, backgroundColor: c.ground }, webInput]}
        />
      ) : null}
      {dueDate || parsed.priority || parsed.tags.length || list ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {dueDate ? chip(`${relativeDay(dueDate, today)}${parsed.startTime ? `, ${timeRange(parsed.startTime, parsed.endTime)}` : ''}`, 'blue') : null}
          {parsed.priority ? chip(PRIORITY_LABEL[parsed.priority], parsed.priority === 3 ? 'red' : 'blue') : null}
          {parsed.tags.map((t) => chip(`#${t}`, 'blue'))}
          {list ? chip(list.name, 'grey', <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: listColors[list.color] }} />) : null}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.ground }}>
        <AppText tone="secondary" style={{ fontSize: 12.5 }}>
          Dates, <AppText style={{ ...font(700), fontSize: 12.5 }}>#tags</AppText>, <AppText style={{ ...font(700), fontSize: 12.5 }}>!priority</AppText>,{' '}
          <AppText style={{ ...font(700), fontSize: 12.5 }}>~list</AppText>
        </AppText>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Kbd k="Shift" />
          <Kbd k="Enter" />
          <AppText tone="secondary" style={{ fontSize: 12.5 }}>
            add a description
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Kbd k="Esc" />
          <AppText tone="secondary" style={{ fontSize: 12.5 }}>
            close
          </AppText>
        </View>
        <PressScale accessibilityRole="button" disabled={!can} onPress={save} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 38, paddingLeft: 16, paddingRight: 12, borderRadius: 13, backgroundColor: can ? c.accent : c.line }}>
          <AppText style={{ ...font(800), fontSize: 13.5, color: c.onAccent }}>Add</AppText>
          <Kbd k="Enter" onAccent />
        </PressScale>
      </View>
    </PopCard>
  );
}

type Filter = 'all' | 'tasks' | 'notes' | 'done';

/** WSearch: / search with filters and highlighted matches. */
function SearchPop() {
  const { c } = useTheme();
  const tasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const tags = useStore((s) => s.tags);
  const inbox = useStore((s) => s.inbox);
  const notes = useStore((s) => s.notes);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [cursor, setCursor] = useState(0);
  const input = useRef<TextInputInstance>(null);
  useFocusSoon(input);
  const today = todayKey();
  const r = search(q, { tasks, lists, tags, inbox, notes });
  const open = r.tasks.filter((t) => !t.doneAt);
  const done = r.tasks.filter((t) => t.doneAt);
  const showTasks = filter === 'all' || filter === 'tasks' ? open : [];
  const showDone = filter === 'all' || filter === 'done' ? done : [];
  const showNotes = filter === 'all' || filter === 'notes' ? r.notes : [];
  type Hit = { key: string; title: string; sub: string; done?: boolean; go: () => void };
  const listName = (id: string | null) => lists.find((l) => l.id === id)?.name;
  const taskHits: Hit[] = showTasks.map((t) => ({
    key: t.id,
    title: t.title,
    sub: [t.dueDate ? dueShort(t, today) : 'No date', listName(t.listId)].filter(Boolean).join(' · '),
    go: () => {
      closeOverlay();
      selectTask(t.id);
    },
  }));
  const doneHits: Hit[] = showDone.map((t) => ({
    key: t.id,
    title: t.title,
    done: true,
    sub: [`Done ${monthDay(toKey(new Date(t.doneAt!)))}`, listName(t.listId)].filter(Boolean).join(' · '),
    go: () => {
      closeOverlay();
      selectTask(t.id);
    },
  }));
  const noteHits: Hit[] = showNotes.map((n) => ({
    key: n.id,
    title: n.title,
    sub: `${n.kind === 'inbox' ? 'Inbox' : 'Note'} · ${relativeDay(toKey(new Date(n.createdAt)), today)}`,
    go: () => {
      closeOverlay();
      if (n.kind === 'inbox') goMain('/inbox');
      else router.navigate({ pathname: '/note/[id]', params: { id: n.id } });
    },
  }));
  const hits = [...taskHits, ...doneHits, ...noteHits];
  const at = Math.min(cursor, Math.max(0, hits.length - 1));
  const filters: Filter[] = ['all', 'tasks', 'notes', 'done'];

  const marked = (t: string) =>
    highlightParts(t, q.replace(/^#/, '')).map((p, i) =>
      p.hit ? (
        <Text key={i} style={{ backgroundColor: '#FFE7A8', color: '#141A2E', borderRadius: 4 }}>
          {p.t}
        </Text>
      ) : (
        p.t
      ),
    );

  const group = (label: string, list: Hit[], offset: number) =>
    list.length ? (
      <View key={label}>
        <AppText style={{ ...font(700), fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', color: c.textSecondary, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 6 }}>{`${label} · ${list.length}`}</AppText>
        {list.map((h, i) => {
          const sel = offset + i === at;
          return (
            <PressScale
              key={h.key}
              kind="row"
              accessibilityRole="button"
              onPress={h.go}
              onHoverIn={() => setCursor(offset + i)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6, paddingLeft: 18, paddingRight: 10, borderRadius: 12, backgroundColor: sel ? c.tint : 'transparent' }}
            >
              <View style={{ flex: 1 }}>
                <AppText numberOfLines={1} style={{ ...font(h.done ? 600 : 700), fontSize: 15, color: h.done ? c.textSecondary : c.text, textDecorationLine: h.done ? 'line-through' : 'none' }}>
                  {marked(h.title)}
                </AppText>
                <AppText tone="secondary" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {h.sub}
                </AppText>
              </View>
              {sel ? <Kbd k="Enter" /> : null}
            </PressScale>
          );
        })}
      </View>
    ) : null;

  return (
    <PopCard label="Search" style={{ paddingTop: 8, paddingHorizontal: 8, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: c.ground }}>
        <Icon name="search" size={20} color={c.textSecondary} />
        <TextInput
          ref={input}
          autoFocus
          value={q}
          onChangeText={(t) => {
            setQ(t);
            setCursor(0);
          }}
          onKeyPress={(e) => {
            const k = e.nativeEvent.key;
            const pd = () => (e as unknown as { preventDefault: () => void }).preventDefault();
            if (k === 'ArrowDown') {
              pd();
              setCursor(Math.min(hits.length - 1, at + 1));
            } else if (k === 'ArrowUp') {
              pd();
              setCursor(Math.max(0, at - 1));
            } else if (k === 'Enter') {
              pd();
              hits[at]?.go();
            } else if (k === 'Tab') {
              pd();
              setFilter(filters[(filters.indexOf(filter) + 1) % filters.length]);
            }
          }}
          placeholder="Search tasks and notes"
          placeholderTextColor={c.textSecondary}
          accessibilityLabel="Search"
          style={[{ flex: 1, ...font(700), fontSize: 18, color: c.text }, webInput]}
        />
        <Kbd k="Esc" />
      </View>
      <View style={{ flexDirection: 'row', gap: 6, paddingTop: 12, paddingHorizontal: 10, paddingBottom: 4 }}>
        {filters.map((f) => {
          const on = f === filter;
          return (
            <PressScale key={f} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setFilter(f)} style={{ minHeight: 32, paddingHorizontal: 12, borderRadius: 14, backgroundColor: on ? c.accent : c.ground, justifyContent: 'center' }}>
              <AppText style={{ ...font(700), fontSize: 13, color: on ? c.onAccent : c.text }}>{f[0].toUpperCase() + f.slice(1)}</AppText>
            </PressScale>
          );
        })}
      </View>
      <ScrollView style={{ maxHeight: 420 }}>
        {q.trim() && !hits.length ? (
          <AppText tone="secondary" style={{ padding: 18, fontSize: 14.5 }}>{`Nothing matches "${q.trim()}". Try fewer words.`}</AppText>
        ) : null}
        {group('Tasks', taskHits, 0)}
        {group('Done', doneHits, taskHits.length)}
        {group('Notes', noteHits, taskHits.length + doneHits.length)}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 14, paddingTop: 12, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: c.ground, marginTop: 6 }}>
        {(
          [
            [['↑', '↓'], 'choose'],
            [['Enter'], 'open'],
            [['Tab'], 'next filter'],
          ] as [string[], string][]
        ).map(([ks, l]) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {ks.map((k) => (
              <Kbd key={k} k={k} />
            ))}
            <AppText tone="secondary" style={{ fontSize: 12.5 }}>
              {l}
            </AppText>
          </View>
        ))}
      </View>
    </PopCard>
  );
}

const SHORTCUTS: { cap: string; rows: [string, string[]][] }[] = [
  {
    cap: 'Anywhere',
    rows: [
      ['Quick add', ['Q']],
      ['Dump a note to Inbox', ['N']],
      ['Search', ['/']],
      ['Show shortcuts', ['?']],
      ['Go to Today / Inbox / Calendar', ['G', 'then', 'T', 'I', 'C']],
      ['Undo', ['Ctrl', 'Z']],
    ],
  },
  {
    cap: 'Selected task',
    rows: [
      ['Move up / down', ['↑', '↓']],
      ['Open details', ['Enter']],
      ['Mark done', ['Space']],
      ['Date', ['D']],
      ['Move to list', ['M']],
      ['Priority', ['P']],
      ['Tags', ['T']],
      ['Delete', ['Del']],
    ],
  },
  {
    cap: 'Sorting the Inbox',
    rows: [
      ['Today / Tomorrow / This week', ['T', 'M', 'W']],
      ['Lists in order', ['1', '2', '3']],
      ['Keep as note / Skip', ['N', 'S']],
      ['Confirm / Stop', ['Enter', 'Esc']],
    ],
  },
  {
    cap: 'Check-in card on Today',
    rows: [
      ['Today / Tomorrow / Pick day', ['1', '2', '3']],
      ['Move all to today', ['A']],
    ],
  },
];

/** WShortcuts: the ? overlay (source of truth for keys). */
function ShortcutsPop() {
  const { c } = useTheme();
  return (
    <PopCard label="Keyboard shortcuts" width={760} style={{ paddingVertical: 26, paddingHorizontal: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 22, flex: 1 }}>
          Keyboard shortcuts
        </AppText>
        <Kbd k="Esc" />
        <AppText tone="secondary" style={{ fontSize: 13, marginLeft: 6 }}>
          close
        </AppText>
      </View>
      {SHORTCUTS.map((g, gi) => (
        <View key={g.cap} style={{ marginTop: gi ? 14 : 20 }}>
          <AppText style={{ ...font(700), fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', color: c.textSecondary, marginBottom: 8 }}>{g.cap}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 36 }}>
            {g.rows.map(([label, keys]) => (
              <View key={label} style={{ width: '46%', flexGrow: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText style={{ fontSize: 14 }}>{label}</AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {keys.map((k, i) =>
                    k === 'then' ? (
                      <AppText key={i} tone="secondary" style={{ fontSize: 13 }}>
                        then
                      </AppText>
                    ) : (
                      <Kbd key={i} k={k} />
                    ),
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </PopCard>
  );
}

/** WWelcome: first time on the computer. */
function WelcomePop() {
  const { c } = useTheme();
  const done = () => {
    useLocal.setState({ deskWelcomed: true });
    closeOverlay();
  };
  const row = (lead: ReactNode, title: string, body: ReactNode, last?: boolean) => (
    <View style={{ flexDirection: 'row', gap: 14, paddingVertical: 16, paddingHorizontal: 18, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.card }}>
      {lead}
      <View style={{ flex: 1 }}>
        <AppText style={{ ...font(800), fontSize: 15 }}>{title}</AppText>
        <AppText tone="secondary" style={{ fontSize: 13.5, lineHeight: 20, marginTop: 2 }}>
          {body}
        </AppText>
      </View>
    </View>
  );
  return (
    <PopCard label="Welcome" width={560} style={{ padding: 30, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View aria-hidden style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <LoopMarkSvg size={26} color="#FFFFFF" />
        </View>
        <View>
          <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 21 }}>
            Loop on your computer
          </AppText>
          <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 2 }}>
            Your tasks are here. Three things work differently.
          </AppText>
        </View>
      </View>
      <View style={{ backgroundColor: c.ground, borderRadius: 18 }}>
        {row(<Kbd k="Q" style={{ minWidth: 32, height: 32, justifyContent: 'center' }} />, 'Quick add from anywhere', 'Type "call bank tomorrow 10am #personal" and Loop fills in the rest. N drops a note into Inbox.')}
        {row(
          <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: c.desk.kbdBg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="drag" size={18} color={c.textSecondary} />
          </View>,
          'Drag and right-click',
          'Drag tasks onto a list or a calendar time. Right-click a task for its quick actions.',
        )}
        {row(
          <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sun" size={18} color={c.accentText} />
          </View>,
          'Check-ins wait for you on Today',
          'No pop-ups here. Your phone still nudges you in the morning and afternoon. Answer on either one.',
          true,
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <PressScale accessibilityRole="button" onPress={() => useDeskState.setState({ overlay: 'shortcuts' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
          <AppText style={{ ...font(700), fontSize: 14, color: c.accentText }}>See all shortcuts</AppText>
          <Kbd k="?" />
        </PressScale>
        <PressScale accessibilityRole="button" onPress={done} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.accent }}>
          <AppText style={{ ...font(800), fontSize: 14.5, color: c.onAccent }}>Got it</AppText>
          <Kbd k="Enter" onAccent />
        </PressScale>
      </View>
    </PopCard>
  );
}
