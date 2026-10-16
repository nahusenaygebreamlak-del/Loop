import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { OptionGroup, SheetTitle, Swatch } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { openCount } from '@/lib/taskViews';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, radius, type ThemePreference } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { OptionRow } from './parts';

/**
 * TEMPORARY (Milestone 1 only): a plain sheet to reach lists, theme and sign out.
 * Replaced by the designed side menu (NSideMenu2) and Settings in Milestone 2.
 */
export function TempMenuSheet() {
  const { c, preference, setPreference } = useTheme();
  const close = useCloseSheet();
  const { signOut } = useAuth();
  const allLists = useStore((s) => s.lists);
  const lists = allLists.filter((l) => !l.deletedAt && !l.archivedAt).sort((a, b) => a.sortOrder - b.sortOrder);
  const tasks = useStore((s) => s.tasks);

  const go = (fn: () => void) => {
    close();
    fn();
  };

  return (
    <SheetCard label="Menu" style={{ paddingBottom: 28 }}>
      <SheetTitle hint="Temporary menu. The designed side menu comes in the next milestone.">Menu</SheetTitle>
      <OptionGroup>
        <OptionRow role="button" label="Today" lead={<Icon name="sun" color={c.text} />} onPress={() => go(() => router.dismissTo('/'))} />
        {lists.map((l, i) => (
          <OptionRow
            key={l.id}
            role="button"
            label={l.name}
            lead={<Swatch color={listColors[l.color]} />}
            trailing={
              <AppText tone="secondary" style={{ marginLeft: 'auto', ...font(600), fontSize: 13.5 }}>
                {openCount(tasks, l.id)}
              </AppText>
            }
            last={i === lists.length - 1}
            onPress={() => go(() => router.push({ pathname: '/list/[id]', params: { id: l.id } }))}
          />
        ))}
      </OptionGroup>
      <View style={{ flexDirection: 'row', borderRadius: radius.buttonSmall, padding: 4, backgroundColor: c.segmentTrack }} accessibilityRole="radiogroup" accessibilityLabel="Theme">
        {(['light', 'dark', 'system'] as ThemePreference[]).map((p) => {
          const on = preference === p;
          return (
            <PressScale
              key={p}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setPreference(p)}
              style={{ flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.card : 'transparent' }}
            >
              <AppText variant="caption" tone={on ? 'text' : 'secondary'}>
                {p === 'system' ? 'Follow phone' : p === 'light' ? 'Light' : 'Dark'}
              </AppText>
            </PressScale>
          );
        })}
      </View>
      <PressScale accessibilityRole="button" onPress={() => go(signOut)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'center' }}>
        <AppText variant="button" tone="danger">
          Sign out
        </AppText>
      </PressScale>
    </SheetCard>
  );
}
