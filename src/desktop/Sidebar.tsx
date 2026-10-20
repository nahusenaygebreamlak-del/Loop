import { usePathname, type Href } from 'expo-router';
import { type ReactNode } from 'react';
import { ScrollView, View, type ViewInstance } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { LoopMarkTile } from '@/components/LoopMark';
import { PressScale } from '@/components/PressScale';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { Spinner } from '@/components/Spinner';
import { goMain } from '@/features/nav';
import { ListEditSheet } from '@/features/sheets/ListEditSheet';
import { addDays } from '@/lib/dates';
import { isOpen, liveLists, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import { useSyncLine } from '@/sync/status';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { useDropTarget } from './dom';
import { Kbd } from './Kbd';
import { useDeskState } from './state';

/** The computer sidebar (264 px): logo and sync line, search, views, lists, tags, then Completed / Trash / Settings / shortcuts. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { c } = useTheme();
  const path = usePathname();
  const sheets = useSheets();
  const snack = useSnackbar();
  const sync = useSyncLine();
  const { today } = useToday();
  const allTasks = useStore((s) => s.tasks);
  const allLists = useStore((s) => s.lists);
  const tags = useStore((s) => s.tags);
  const inbox = useStore((s) => s.inbox);
  const notes = useStore((s) => s.notes);
  const updateTask = useStore((s) => s.updateTask);

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
    onNavigate?.();
    goMain(href);
  };
  const on = (p: string) => (p === '/' ? path === '/' : path === p || path.startsWith(`${p}/`));

  return (
    <View accessibilityRole="menu" accessibilityLabel="Main menu" style={{ width: 264, height: '100%', paddingTop: 20, paddingHorizontal: 14, paddingBottom: 18, backgroundColor: c.ground }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2, paddingHorizontal: 8, paddingBottom: 14 }}>
        <LoopMarkTile size={36} />
        <View style={{ flex: 1 }}>
          <AppText style={{ ...font(800), fontSize: 17 }}>Loop</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {sync.tone === 'syncing' ? <Spinner size={10} /> : null}
            <AppText
              numberOfLines={1}
              accessibilityLiveRegion="polite"
              style={{ ...font(500), fontSize: 12.5, color: sync.tone === 'syncing' ? c.accentText : sync.tone === 'warn' ? c.warnText : c.textSecondary }}
            >
              {sync.line}
            </AppText>
          </View>
        </View>
      </View>
      <PressScale
        kind="row"
        accessibilityRole="search"
        accessibilityLabel="Search"
        onPress={() => useDeskState.setState({ overlay: 'search' })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42, paddingLeft: 12, paddingRight: 10, borderRadius: 13, backgroundColor: c.card, marginBottom: 12 }}
      >
        <Icon name="search" size={18} color={c.textSecondary} />
        <AppText tone="secondary" style={{ flex: 1, fontSize: 14 }}>
          Search
        </AppText>
        <Kbd k="/" />
      </PressScale>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 2, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        <Item icon="sun" label="Today" count={counts.today} on={on('/')} onPress={() => go('/')} />
        <Item icon="next7" label="Next 7 Days" count={counts.next7} on={on('/next7')} onPress={() => go('/next7')} />
        <Item icon="inboxTray" label="Inbox" count={counts.inbox} on={on('/inbox')} onPress={() => go('/inbox')} />
        <Item icon="note" label="Notes" count={counts.notes} on={on('/notes') || on('/note')} onPress={() => go('/notes')} />
        <Item icon="calendar" label="Calendar" on={on('/calendar')} onPress={() => go('/calendar')} />
        <Item icon="allTasks" label="All tasks" count={counts.all} on={on('/all')} onPress={() => go('/all')} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingHorizontal: 10, paddingBottom: 4 }}>
          <AppText tone="secondary" accessibilityRole="header" style={{ ...font(700), fontSize: 12.5 }}>
            Lists
          </AppText>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel="New list"
            onPress={() => sheets.open(() => <ListEditSheet onSaved={(id) => go({ pathname: '/list/[id]', params: { id } })} />)}
            style={{ width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="plus" size={18} color={c.textSecondary} />
          </PressScale>
        </View>
        {lists.map((l) => (
          <Item
            key={l.id}
            lead={<View style={{ width: 11, height: 11, borderRadius: 3, marginHorizontal: 4, backgroundColor: listColors[l.color] }} />}
            label={l.name}
            count={tasks.filter((t) => isOpen(t) && t.listId === l.id).length}
            on={path === `/list/${l.id}`}
            onPress={() => go({ pathname: '/list/[id]', params: { id: l.id } })}
            onDropTask={(id) => {
              const before = useStore.getState().tasks.find((t) => t.id === id)?.listId ?? null;
              updateTask(id, { listId: l.id });
              snack({ title: `Moved to ${l.name}`, actions: [{ label: 'Undo', onPress: () => updateTask(id, { listId: before }) }] });
            }}
          />
        ))}

        {usedTags.length ? (
          <View style={{ paddingTop: 16, paddingHorizontal: 10, paddingBottom: 4 }}>
            <AppText tone="secondary" accessibilityRole="header" style={{ ...font(700), fontSize: 12.5 }}>
              Tags
            </AppText>
          </View>
        ) : null}
        {usedTags.map((t) => (
          <Item
            key={t.id}
            lead={
              <AppText tone="secondary" style={{ width: 19, textAlign: 'center', ...font(700) }}>
                #
              </AppText>
            }
            label={t.name}
            count={tasks.filter((x) => isOpen(x) && x.tagIds.includes(t.id)).length}
            on={path === `/tag/${t.id}`}
            onPress={() => go({ pathname: '/tag/[id]', params: { id: t.id } })}
            onDropTask={(id) => {
              const task = useStore.getState().tasks.find((x) => x.id === id);
              if (!task || task.tagIds.includes(t.id)) return;
              updateTask(id, { tagIds: [...task.tagIds, t.id] });
              snack({ title: `Tagged #${t.name}`, actions: [{ label: 'Undo', onPress: () => updateTask(id, { tagIds: task.tagIds }) }] });
            }}
          />
        ))}
      </ScrollView>

      <View style={{ gap: 2, paddingTop: 8 }}>
        <Item icon="completed" label="Completed" on={on('/completed')} onPress={() => go('/completed')} />
        <Item icon="trash" label="Trash" on={on('/trash')} onPress={() => go('/trash')} />
        <Item icon="gear" label="Settings" on={on('/settings')} onPress={() => go('/settings')} />
        <PressScale
          kind="row"
          accessibilityRole="button"
          onPress={() => useDeskState.setState({ overlay: 'shortcuts' })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40, paddingHorizontal: 10, borderRadius: 12 }}
        >
          <Kbd k="?" />
          <AppText tone="secondary" style={{ ...font(600), fontSize: 14 }}>
            Keyboard shortcuts
          </AppText>
        </PressScale>
      </View>
    </View>
  );
}

function Item({
  icon,
  lead,
  label,
  count,
  on,
  onPress,
  onDropTask,
}: {
  icon?: IconName;
  lead?: ReactNode;
  label: string;
  count?: number;
  on?: boolean;
  onPress: () => void;
  onDropTask?: (taskId: string) => void;
}) {
  const { c } = useTheme();
  const [dropRef, over] = useDropTarget<ViewInstance>((p) => onDropTask?.(p.id), !!onDropTask);
  const fg = on ? c.accentText : c.text;
  return (
    <View ref={dropRef}>
      <PressScale
        kind="row"
        accessibilityRole="menuitem"
        accessibilityState={{ selected: !!on }}
        accessibilityLabel={count ? `${label}, ${count}` : label}
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 40,
          paddingHorizontal: 10,
          borderRadius: 12,
          backgroundColor: on || over ? c.tint : 'transparent',
          borderWidth: over ? 2 : 0,
          borderColor: c.accent,
        }}
      >
        {icon ? <Icon name={icon} size={19} color={on ? c.accentText : c.textSecondary} /> : lead}
        <AppText numberOfLines={1} style={{ flex: 1, ...font(600), fontSize: 14.5, color: fg }}>
          {label}
        </AppText>
        {count ? <AppText style={{ ...font(600), fontSize: 13, color: on ? c.accentText : c.textSecondary }}>{count}</AppText> : null}
      </PressScale>
    </View>
  );
}
