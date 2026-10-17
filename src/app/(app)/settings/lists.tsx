import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { Card, GroupLabel, IconButton, Swatch } from '@/components/ui';
import { goBack, goMain } from '@/features/nav';
import { ListEditSheet } from '@/features/sheets/ListEditSheet';
import { liveLists, openCount } from '@/lib/taskViews';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

/** Settings › Lists: order and archived lists. Not drawn in the designs; built from the settings and list-row patterns. */
export default function ListsSettings() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const snack = useSnackbar();
  const lists = useStore((s) => s.lists);
  const tasks = useStore((s) => s.tasks);
  const updateList = useStore((s) => s.updateList);
  const live = liveLists(lists);
  const archived = lists.filter((l) => !l.deletedAt && l.archivedAt);

  const move = (i: number, d: -1 | 1) => {
    const a = live[i];
    const b = live[i + d];
    if (!a || !b) return;
    updateList(a.id, { sortOrder: b.sortOrder });
    updateList(b.id, { sortOrder: a.sortOrder });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 + insets.bottom }}>
        <View style={{ paddingTop: 18, paddingLeft: 14, paddingRight: size.sideMargin }}>
          <IconButton icon="back" label="Back to Settings" onPress={goBack} />
          <AppText variant="display" accessibilityRole="header" style={{ marginTop: 8, marginLeft: 10 }}>
            Lists
          </AppText>
        </View>

        <GroupLabel style={{ paddingTop: 22 }}>Order in the menu</GroupLabel>
        <Card>
          {live.map((l, i) => (
            <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingLeft: 20, paddingRight: 6, borderBottomWidth: i < live.length - 1 ? 1 : 0, borderBottomColor: c.ground }}>
              <Swatch color={listColors[l.color]} size={12} />
              <PressScale kind="row" accessibilityRole="button" accessibilityHint="Opens the list" onPress={() => goMain({ pathname: '/list/[id]', params: { id: l.id } })} style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}>
                <AppText style={{ ...font(700), fontSize: 15 }}>{l.name}</AppText>
                <AppText tone="secondary" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {openCount(tasks, l.id)} open
                </AppText>
              </PressScale>
              <PressScale accessibilityRole="button" accessibilityLabel={`Move ${l.name} up`} disabled={i === 0} onPress={() => move(i, -1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: i === 0 ? 0.3 : 1 }}>
                <View style={{ transform: [{ rotate: '90deg' }] }}>
                  <Icon name="back" size={20} color={c.textSecondary} />
                </View>
              </PressScale>
              <PressScale accessibilityRole="button" accessibilityLabel={`Move ${l.name} down`} disabled={i === live.length - 1} onPress={() => move(i, 1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: i === live.length - 1 ? 0.3 : 1 }}>
                <View style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Icon name="back" size={20} color={c.textSecondary} />
                </View>
              </PressScale>
            </View>
          ))}
        </Card>
        <PressScale accessibilityRole="button" onPress={() => sheets.open(() => <ListEditSheet />)} style={{ marginTop: 8, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="plus" size={20} color={c.accentText} />
          <AppText tone="accent" style={{ ...font(700), fontSize: 15 }}>
            New list
          </AppText>
        </PressScale>

        <GroupLabel style={{ paddingTop: 12 }}>Archived</GroupLabel>
        {archived.length === 0 ? (
          <EmptyState icon="archive" title="No archived lists" text="Archive a list from its ⋯ menu to hide it without losing tasks." />
        ) : (
          <Card>
            {archived.map((l, i) => (
              <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingLeft: 20, paddingRight: 10, borderBottomWidth: i < archived.length - 1 ? 1 : 0, borderBottomColor: c.ground }}>
                <Swatch color={listColors[l.color]} size={12} />
                <AppText style={{ flex: 1, ...font(700), fontSize: 15 }}>{l.name}</AppText>
                <PressScale
                  accessibilityRole="button"
                  accessibilityLabel={`Restore ${l.name}`}
                  onPress={() => {
                    updateList(l.id, { archivedAt: null });
                    snack({ title: `"${l.name}" is back in your lists` });
                  }}
                  style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.ground, justifyContent: 'center' }}
                >
                  <AppText tone="accent" style={{ ...font(700), fontSize: 14 }}>
                    Restore
                  </AppText>
                </PressScale>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
