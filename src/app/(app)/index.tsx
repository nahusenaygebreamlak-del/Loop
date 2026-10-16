import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { PressScale } from '@/components/PressScale';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemePreference } from '@/theme/tokens';
import { radius, size } from '@/theme/tokens';

// Temporary Milestone 0 landing screen. Replaced by Today (VToday) in Milestone 1.
export default function Home() {
  const { c, preference, setPreference } = useTheme();
  const { session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const name = session?.user.user_metadata?.full_name ?? session?.user.email ?? '';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 48 }]}>
      <AppText variant="display" accessibilityRole="header">
        You're in
      </AppText>
      <AppText tone="secondary" variant="secondary">
        Signed in as {name}. Today arrives in the next milestone.
      </AppText>

      <View style={[styles.card, { backgroundColor: c.card }]}>
        <AppText variant="label" tone="secondary">
          Theme
        </AppText>
        <View style={[styles.segment, { backgroundColor: c.segmentTrack }]} accessibilityRole="radiogroup">
          {(['light', 'dark', 'system'] as ThemePreference[]).map((p) => {
            const on = preference === p;
            return (
              <PressScale
                key={p}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setPreference(p)}
                style={[styles.segmentItem, on && { backgroundColor: c.card }]}
              >
                <AppText variant="caption" tone={on ? 'text' : 'secondary'}>
                  {p === 'system' ? 'Follow phone' : p === 'light' ? 'Light' : 'Dark'}
                </AppText>
              </PressScale>
            );
          })}
        </View>
      </View>

      <PressScale accessibilityRole="button" onPress={signOut} style={styles.signOut}>
        <AppText variant="button" tone="danger">
          Sign out
        </AppText>
      </PressScale>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: size.sideMargin, gap: 12 },
  card: { borderRadius: radius.card, padding: 20, gap: 12, marginTop: 24 },
  segment: { flexDirection: 'row', borderRadius: radius.buttonSmall, padding: 4 },
  segmentItem: { flex: 1, minHeight: size.minTapTarget, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  signOut: { minHeight: size.minTapTarget, justifyContent: 'center', alignSelf: 'flex-start' },
});
