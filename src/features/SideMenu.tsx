import { router, usePathname, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useCloseSheet, useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { IconButton } from '@/components/ui';
import { addDays } from '@/lib/dates';
import { isOpen, liveLists, openCount, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { goMain } from './nav';
import { ListEditSheet } from './sheets/ListEditSheet';

/** NSideMenu2 */
export function SideMenu() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const close = useCloseSheet();
  const sheets = useSheets();
  const snack = useSnackbar();
  const path = usePathname();
  const { today } = useToday();
  const allTasks = useStore((s) => s.tasks);
  const allLists = useStore((s) => s.lists);
  const tags = useStore((s) => s.tags);
  const inbox = useStore((s) => s.inbox);
  const notes = useStore((s) => s.notes);

  const tasks = visibleTasks(allTasks, allLists);
  const lists = liveLists(allLists);
  const week = addDays(today, 6);
  const counts = {
    today: tasks.filter((t) => isOpen(t) && t.dueDate === today).length,
    next7: tasks.filter((t) => isOpen(t) && t.dueDate && t.dueDate >= today && t.dueDate <= week).length,
    inbox: inbox.filter((i) => !i.deletedAt && !i.sortedAt).length,
    notes: notes.filter((n) => !n.deletedAt).length,
    all: tasks.filter(isOpen).length,
  };
  const usedTags = tags.filter((t) => tasks.some((x) => isOpen(x) && x.tagIds.includes(t.id)));

  const go = (href: Href) => {
    close();
    goMain(href);
  };
  const later = (what: string, milestone: number) => {
    close();
    snack({ title: `${what} arrives in Milestone ${milestone}` });
  };

  return (
    <View
      accessibilityRole="menu"
      accessibilityLabel="Main menu"
      style={[styles.nav, { backgroundColor: c.ground, paddingTop: 18 + insets.top, paddingBottom: 20 + insets.bottom }]}
    >
      <View style={styles.head}>
        <View aria-hidden style={[styles.mark, { backgroundColor: c.accent }]}>
          <AppText style={{ ...font(800), fontSize: 18, color: c.onAccent }}>L</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={{ ...font(800), fontSize: 17 }}>Loop</AppText>
          <AppText tone="secondary" style={{ fontSize: 13 }}>
            Saved on this phone
          </AppText>
        </View>
        <IconButton
          icon="gear"
          label="Settings"
          onPress={() => {
            close();
            router.push('/settings');
          }}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Item icon="sun" label="Today" count={counts.today} on={path === '/'} onPress={() => go('/')} />
          <Item icon="next7" label="Next 7 Days" count={counts.next7} on={path === '/next7'} onPress={() => go('/next7')} />
          <Item icon="inboxTray" label="Inbox" count={counts.inbox} on={path.startsWith('/inbox')} onPress={() => go('/inbox')} />
          <Item icon="note" label="Notes" count={counts.notes} on={path === '/notes'} onPress={() => go('/notes')} />
          <Item icon="calendar" label="Calendar" onPress={() => later('Calendar', 7)} />
          <Item icon="allTasks" label="All tasks" count={counts.all} on={path === '/all'} onPress={() => go('/all')} />
        </View>

        <View style={styles.lab}>
          <AppText tone="secondary" style={styles.labText} accessibilityRole="header">
            Lists
          </AppText>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel="Add list"
            onPress={() => sheets.open(() => <ListEditSheet onSaved={(id) => go({ pathname: '/list/[id]', params: { id } })} />)}
            style={{ width: 44, height: 44, marginRight: -4, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="plus" color={c.textSecondary} />
          </PressScale>
        </View>
        <View style={{ gap: 2 }}>
          {lists.map((l) => (
            <Item
              key={l.id}
              lead={<View style={{ width: 12, height: 12, borderRadius: 4, marginHorizontal: 5, backgroundColor: listColors[l.color] }} />}
              label={l.name}
              count={openCount(tasks, l.id)}
              on={path === `/list/${l.id}`}
              onPress={() => go({ pathname: '/list/[id]', params: { id: l.id } })}
            />
          ))}
        </View>

        {usedTags.length ? (
          <>
            <View style={styles.lab}>
              <AppText tone="secondary" style={styles.labText} accessibilityRole="header">
                Tags
              </AppText>
            </View>
            <View style={styles.tags}>
              {usedTags.map((t) => {
                const on = path === `/tag/${t.id}`;
                return (
                  <PressScale
                    key={t.id}
                    accessibilityRole="button"
                    onPress={() => go({ pathname: '/tag/[id]', params: { id: t.id } })}
                    style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', backgroundColor: on ? c.tint : c.card }}
                  >
                    <AppText style={{ ...font(600), fontSize: 14, color: on ? c.accentText : c.text }}>#{t.name}</AppText>
                  </PressScale>
                );
              })}
            </View>
          </>
        ) : null}

        <View style={{ flex: 1, minHeight: 20 }} />
        <View style={{ gap: 2 }}>
          <Item icon="completed" label="Completed" on={path === '/completed'} onPress={() => go('/completed')} />
          <Item icon="trash" label="Trash" on={path === '/trash'} onPress={() => go('/trash')} />
        </View>
      </ScrollView>
    </View>
  );
}

function Item({ icon, lead, label, count, on, onPress }: { icon?: IconName; lead?: ReactNode; label: string; count?: number; on?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const color = on ? c.accentText : c.textSecondary;
  return (
    <PressScale
      kind="row"
      accessibilityRole="menuitem"
      accessibilityState={{ selected: !!on }}
      accessibilityLabel={count != null ? `${label}, ${count}` : label}
      onPress={onPress}
      style={[styles.item, on && { backgroundColor: c.tint }]}
    >
      {icon ? <Icon name={icon} color={color} /> : lead}
      <AppText style={{ ...font(600), fontSize: 15.5, color: on ? c.accentText : c.text }}>{label}</AppText>
      {count != null ? <AppText style={{ marginLeft: 'auto', ...font(600), fontSize: 13.5, color, fontVariant: ['tabular-nums'] }}>{count}</AppText> : null}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  nav: { width: size.sideMenuWidth, height: '100%', paddingHorizontal: 14, borderTopRightRadius: radius.sheet, borderBottomRightRadius: radius.sheet },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4, paddingHorizontal: 10, paddingBottom: 18 },
  mark: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.card, padding: 6, gap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48, paddingHorizontal: 14, borderRadius: 14 },
  lab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, paddingHorizontal: 14, minHeight: 50 },
  labText: { ...font(700), fontSize: 13 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4, paddingHorizontal: 14 },
});
