import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { TaskRow } from '@/components/rows';
import { Card, EmptyCard, GroupLabel, IconButton, Swatch } from '@/components/ui';
import { goBack, goMain } from '@/features/nav';
import { useTaskActions } from '@/features/useTaskActions';
import { addDays, monthDay, toKey, weekdayShort } from '@/lib/dates';
import { dueShort, highlightParts, openCount, search } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

type Filter = 'all' | 'tasks' | 'notes' | 'lists';

/** VSearch */
export default function Search() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const actions = useTaskActions();
  const { today } = useToday();
  const tasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const tags = useStore((s) => s.tags);
  const inbox = useStore((s) => s.inbox);
  const notes = useStore((s) => s.notes);
  const recent = useSettings((s) => s.recentSearches);
  const addRecent = useSettings((s) => s.addRecentSearch);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const r = search(q, { tasks, lists, tags, inbox, notes });
  const show = (f: Filter) => filter === 'all' || filter === f;
  const nothing = q.trim() && !r.tasks.length && !r.notes.length && !r.lists.length;
  const remember = () => addRecent(q);

  // Highlighted parts use plain Text so they inherit the surrounding title style.
  const marked = (text: string) =>
    highlightParts(text, q.replace(/^#/, '')).map((p, i) =>
      p.hit ? (
        <Text key={i} style={{ color: c.accentText, backgroundColor: c.tint }}>
          {p.t}
        </Text>
      ) : (
        p.t
      ),
    );

  const doneLabel = (iso: string) => `Done ${monthDay(toKey(new Date(iso)))}`;

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 + insets.bottom }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 18, paddingRight: size.sideMargin, paddingLeft: 14 }}>
          <IconButton icon="back" label="Back" onPress={goBack} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingLeft: 16, paddingRight: 4, borderRadius: 16, backgroundColor: c.card }}>
            <Icon name="search" size={20} color={c.textSecondary} />
            <TextInput
              autoFocus
              value={q}
              onChangeText={setQ}
              onSubmitEditing={remember}
              returnKeyType="search"
              placeholder="Search tasks, notes, lists"
              placeholderTextColor={c.textSecondary}
              accessibilityLabel="Search"
              autoCapitalize="none"
              style={[{ flex: 1, minWidth: 0, fontSize: 16, color: c.text, ...font(600) }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
            />
            {q ? (
              <PressScale accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQ('')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={20} color={c.textSecondary} />
              </PressScale>
            ) : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingTop: 16, paddingHorizontal: size.sideMargin }}>
          {(['all', 'tasks', 'notes', 'lists'] as Filter[]).map((f) => {
            const on = f === filter;
            return (
              <PressScale
                key={f}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setFilter(f)}
                style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 13, justifyContent: 'center', backgroundColor: on ? c.accent : c.card }}
              >
                <AppText style={{ ...font(600), fontSize: 14, color: on ? c.onAccent : c.textSecondary }}>{f[0].toUpperCase() + f.slice(1)}</AppText>
              </PressScale>
            );
          })}
        </ScrollView>

        {nothing ? (
          <View style={{ paddingTop: 24 }}>
            <EmptyCard>{`Nothing matches "${q.trim()}".`}</EmptyCard>
          </View>
        ) : null}

        {show('tasks') && r.tasks.length ? (
          <>
            <GroupLabel style={{ paddingTop: 24 }}>{`Tasks · ${r.tasks.length}`}</GroupLabel>
            <Card>
              {r.tasks.map((t, i) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  title={marked(t.title)}
                  sub={[t.doneAt ? doneLabel(t.doneAt) : dueShort(t, today), lists.find((l) => l.id === t.listId)?.name].filter(Boolean).join(' · ')}
                  last={i === r.tasks.length - 1}
                  onOpen={() => {
                    remember();
                    actions.openDetails(t.id);
                  }}
                  onToggle={() => actions.toggle(t.id)}
                />
              ))}
            </Card>
          </>
        ) : null}

        {show('notes') && r.notes.length ? (
          <>
            <GroupLabel style={{ paddingTop: 24 }}>{`Notes · ${r.notes.length}`}</GroupLabel>
            <Card>
              {r.notes.map((n, i) => {
                const day = toKey(new Date(n.createdAt));
                return (
                  <PressScale
                    key={n.id}
                    kind="row"
                    accessibilityRole="button"
                    onPress={() => {
                      remember();
                      if (n.kind === 'inbox') goMain('/inbox');
                      else router.push({ pathname: '/note/[id]', params: { id: n.id } });
                    }}
                    style={{ minHeight: 62, paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: i < r.notes.length - 1 ? 1 : 0, borderBottomColor: c.ground }}
                  >
                    <AppText style={{ ...font(700), fontSize: 15.5 }}>{marked(n.title)}</AppText>
                    <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 4 }}>
                      {n.kind === 'inbox' ? 'Inbox' : 'Note'} · {day === today ? 'Today' : day >= addDays(today, -6) ? weekdayShort(day) : monthDay(day)}
                    </AppText>
                  </PressScale>
                );
              })}
            </Card>
          </>
        ) : null}

        {show('lists') && r.lists.length ? (
          <>
            <GroupLabel style={{ paddingTop: 24 }}>{`Lists · ${r.lists.length}`}</GroupLabel>
            <Card>
              {r.lists.map((l, i) => (
                <PressScale
                  key={l.id}
                  kind="row"
                  accessibilityRole="button"
                  onPress={() => {
                    remember();
                    goMain({ pathname: '/list/[id]', params: { id: l.id } });
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 20, borderBottomWidth: i < r.lists.length - 1 ? 1 : 0, borderBottomColor: c.ground }}
                >
                  <Swatch color={listColors[l.color]} size={12} />
                  <AppText style={{ ...font(700), fontSize: 15.5 }}>{marked(l.name)}</AppText>
                  <AppText tone="secondary" style={{ marginLeft: 'auto', ...font(600), fontSize: 13.5 }}>
                    {openCount(tasks, l.id)} open
                  </AppText>
                </PressScale>
              ))}
            </Card>
          </>
        ) : null}

        {recent.length ? (
          <>
            <GroupLabel style={{ paddingTop: 24 }}>Recent searches</GroupLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: size.sideMargin }}>
              {recent.map((s) => (
                <PressScale key={s} accessibilityRole="button" onPress={() => setQ(s)} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 13, justifyContent: 'center', backgroundColor: c.card }}>
                  <AppText tone="secondary" style={{ ...font(600), fontSize: 14 }}>
                    {s}
                  </AppText>
                </PressScale>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
