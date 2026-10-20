import { usePathname } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useLocal } from '@/store/local';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { Kbd } from './Kbd';
import { useDesk } from './layout';
import { Overlays } from './Overlays';
import { DetailPanel } from './Panels';
import { Sidebar } from './Sidebar';
import { openQuickAdd, useDeskState } from './state';
import { useDeskKeys } from './useDeskKeys';
import { useBrowserCheckins } from './browserNotify';

/**
 * The computer layout: sidebar (264), main column, detail panel (400, 16 px from the edges).
 * Under 1200 px the sidebar sits behind ☰ in a top bar; under 900 px the panel slides over the list.
 */
export function DeskShell({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const { sideInline, panelInline } = useDesk();
  const sideOpen = useDeskState((s) => s.sideOpen);
  const selected = useDeskState((s) => s.selected);
  const panelOn = useLocal((l) => l.deskPanel !== false);
  useDeskKeys();
  useBrowserCheckins();

  const path = usePathname();
  // Notes use the right side for the editor, Calendar for its own column, Settings for two columns.
  const ownRight = /^\/(notes|note|settings|calendar)/.test(path);
  const showPanel = !ownRight && panelOn && (panelInline || !!selected);

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.ground }}>
      {sideInline ? <Sidebar /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {!sideInline ? <TopBar /> : null}
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
          {showPanel && panelInline ? (
            <View style={{ width: 400, marginTop: 16, marginRight: 16, marginBottom: 16, backgroundColor: c.card, borderRadius: 24, paddingTop: 26, paddingHorizontal: 26, paddingBottom: 22 }}>
              <DetailPanel />
            </View>
          ) : null}
        </View>
      </View>

      {/* Under 900 px the panel covers the list. */}
      {showPanel && !panelInline ? (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable accessibilityLabel="Close details" onPress={() => useDeskState.setState({ selected: null })} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: c.desk.scrim }} />
          <View style={{ width: 400, maxWidth: '100%', margin: 16, backgroundColor: c.card, borderRadius: 24, paddingTop: 26, paddingHorizontal: 26, paddingBottom: 22, borderWidth: 1, borderColor: c.desk.border }}>
            <DetailPanel />
          </View>
        </View>
      ) : null}

      {/* Under 1200 px the sidebar opens from ☰. */}
      {!sideInline && sideOpen ? (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pressable accessibilityLabel="Close menu" onPress={() => useDeskState.setState({ sideOpen: false })} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: c.desk.scrim }} />
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRightWidth: 1, borderRightColor: c.desk.border }}>
            <Sidebar onNavigate={() => useDeskState.setState({ sideOpen: false })} />
          </View>
        </View>
      ) : null}

      <Overlays />
    </View>
  );
}

/** WNarrow: ☰, Loop, Search and Add task in a top bar. */
function TopBar() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 14, paddingHorizontal: 20, paddingBottom: 6 }}>
      <PressScale accessibilityRole="button" accessibilityLabel="Open menu" onPress={() => useDeskState.setState({ sideOpen: true })} style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="menu" size={22} color={c.text} />
      </PressScale>
      <AppText style={{ ...font(800), fontSize: 17, flex: 1 }}>Loop</AppText>
      <PressScale
        accessibilityRole="search"
        onPress={() => useDeskState.setState({ overlay: 'search' })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingHorizontal: 14, borderRadius: 13, backgroundColor: c.card }}
      >
        <Icon name="search" size={18} color={c.textSecondary} />
        <AppText tone="secondary" style={{ fontSize: 14 }}>
          Search
        </AppText>
        <Kbd k="/" />
      </PressScale>
      <PressScale accessibilityRole="button" onPress={() => openQuickAdd()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingLeft: 14, paddingRight: 12, borderRadius: 13, backgroundColor: c.accent }}>
        <Icon name="plus" size={20} strokeWidth={2.4} color={c.onAccent} />
        <AppText style={{ ...font(800), fontSize: 14.5, color: c.onAccent }}>Add task</AppText>
        <Kbd k="Q" onAccent />
      </PressScale>
    </View>
  );
}
