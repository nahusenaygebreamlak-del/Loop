import { router, usePathname, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useCloseSheet, useSheets } from '@/components/Sheet';
import { IconButton } from '@/components/ui';
import { addDays } from '@/lib/dates';
import { activeSeason, currentSeason, groupByTier, TIER_LABEL, TIERS, weekShort } from '@/lib/seasons';
import { isOpen, liveLists, openCount, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { LoopMarkTile } from '@/components/LoopMark';
import { useSyncLine } from '@/sync/status';
import { Spinner } from '@/components/Spinner';
import { goMain } from './nav';
import { ListEditSheet } from './sheets/ListEditSheet';

/** NSideMenu2 */
export function SideMenu() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const close = useCloseSheet();
  const sheets = useSheets();
  const path = usePathname();
  const sync = useSyncLine();
  const { today } = useToday();
  const allTasks = useStore((s) => s.tasks);
  const allLists = useStore((s) => s.lists);
  const tags = useStore((s) => s.tags);
  const inbox = useStore((s) => s.inbox);
  const notes = useStore((s) => s.notes);
  const seasons = useStore((s) => s.seasons);

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
  // While a season is running, lists are grouped Core / Secondary / Support; empty tiers are hidden.
  const season = activeSeason(seasons, today);
  const shownSeason = season ?? currentSeason(seasons, today);
  const tiered = season ? groupByTier(allLists, season) : null;
  const listGroups = tiered ? TIERS.filter((t) => tiered[t].length).map((t) => ({ label: TIER_LABEL[t], lists: tiered[t] })) : [{ label: 'Lists', lists }];
  const usedTags = tags.filter((t) => tasks.some((x) => isOpen(x) && x.tagIds.includes(t.id)));

  const go = (href: Href) => {
    close();
    goMain(href);
  };

  return (
    <View
      accessibilityRole="menu"
      accessibilityLabel="Main menu"
      style={[styles.nav, { backgroundColor: c.ground, paddingTop: 18 + insets.top, paddingBottom: 20 + insets.bottom }]}
    >
      <View style={styles.head}>
        <LoopMarkTile />
        <View style={{ flex: 1 }}>
          <AppText style={{ ...font(800), fontSize: 17 }}>Loop</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {sync.tone === 'syncing' ? <Spinner size={10} /> : null}
            <AppText
              style={{ fontSize: 13, flexShrink: 1, color: sync.tone === 'syncing' ? c.accentText : sync.tone === 'warn' ? c.warnText : c.textSecondary }}
              numberOfLines={2}
              accessibilityLiveRegion="polite"
            >
              {sync.line}
            </AppText>
          </View>
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
          <Item icon="calendar" label="Calendar" on={path === '/calendar'} onPress={() => go('/calendar')} />
          <Item icon="flag" label="Season" countText={season ? weekShort(season, today) : shownSeason ? 'Soon' : undefined} on={path.startsWith('/season')} onPress={() => go('/season')} />
          <Item icon="allTasks" label="All tasks" count={counts.all} on={path === '/all'} onPress={() => go('/all')} />
        </View>

        {listGroups.map((g, gi) => (
          <View key={g.label}>
            <View style={styles.lab}>
              <AppText tone="secondary" style={styles.labText} accessibilityRole="header">
                {g.label}
              </AppText>
              {gi === 0 ? (
                <PressScale
                  accessibilityRole="button"
                  accessibilityLabel="Add list"
                  onPress={() => sheets.open(() => <ListEditSheet onSaved={(id) => go({ pathname: '/list/[id]', params: { id } })} />)}
                  style={{ width: 44, height: 44, marginRight: -4, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="plus" color={c.textSecondary} />
                </PressScale>
              ) : null}
            </View>
            <View style={{ gap: 2 }}>
              {g.lists.map((l) => (
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
          </View>
        ))}

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

function Item({ icon, lead, label, count, countText, on, onPress }: { icon?: IconName; lead?: ReactNode; label: string; count?: number; countText?: string; on?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const color = on ? c.accentText : c.textSecondary;
  return (
    <PressScale
      kind="row"
      accessibilityRole="menuitem"
      accessibilityState={{ selected: !!on }}
      accessibilityLabel={count != null ? `${label}, ${count}` : countText ? `${label}, ${countText}` : label}
      onPress={onPress}
      style={[styles.item, on && { backgroundColor: c.tint }]}
    >
      {icon ? <Icon name={icon} color={color} /> : lead}
      <AppText style={{ ...font(600), fontSize: 15.5, color: on ? c.accentText : c.text }}>{label}</AppText>
      {count != null || countText ? <AppText style={{ marginLeft: 'auto', ...font(600), fontSize: 13.5, color, fontVariant: ['tabular-nums'] }}>{count ?? countText}</AppText> : null}
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
