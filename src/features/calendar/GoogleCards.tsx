import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useSnackbar } from '@/components/Snackbar';
import { Spinner } from '@/components/Spinner';
import { connectGoogleCalendar, useCalendar } from '@/calendar/google';
import { formatTime, todayKey } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';
import { font } from '@/theme/typography';

const lastSeen = (iso: string | null) => (iso ? formatTime(new Date(iso).toTimeString().slice(0, 5)) : null);

/** NSetupGoogle: "See your meetings next to your tasks?" (first time the Calendar opens). */
export function SetupGoogleCard() {
  const { c } = useTheme();
  const snack = useSnackbar();
  const connecting = useCalendar((s) => s.status === 'connecting');
  const connect = () =>
    connectGoogleCalendar().catch(() => snack({ title: "Couldn't connect Google Calendar", sub: 'Your tasks are fine. Try again in a moment.' }));
  return (
    <View accessibilityLabel="Connect Google Calendar" style={{ marginTop: 16, marginHorizontal: size.sideMargin, backgroundColor: c.card, borderRadius: 22, padding: 20, gap: 14, borderWidth: 2, borderColor: c.tint }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <View aria-hidden style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="calendar" size={24} color={c.accentText} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={{ ...font(800), fontSize: 17, lineHeight: 22 }}>See your meetings next to your tasks?</AppText>
          <AppText tone="secondary" style={{ fontSize: 14, lineHeight: 21, marginTop: 6 }}>
            Loop only reads your Google Calendar. It never changes your events.
          </AppText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PressScale accessibilityRole="button" onPress={connect} disabled={connecting} style={{ flex: 1, minHeight: 50, borderRadius: 16, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          {connecting ? <Spinner color={c.onAccent} track="rgba(255,255,255,0.3)" /> : <AppText style={{ ...font(800), fontSize: 15, color: c.onAccent }}>Connect Google</AppText>}
        </PressScale>
        <PressScale
          accessibilityRole="button"
          onPress={() => useCalendar.setState({ setupDismissed: true })}
          style={{ minHeight: 50, paddingHorizontal: 18, borderRadius: 16, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText tone="secondary" style={{ ...font(700), fontSize: 15 }}>
            Not now
          </AppText>
        </PressScale>
      </View>
    </View>
  );
}

/** NGoogleFailed: shown on the Calendar, and on Today once a day until fixed or dismissed. */
export function GoogleFailedCard({ style }: { style?: object }) {
  const { c } = useTheme();
  const snack = useSnackbar();
  const fetchedAt = useCalendar((s) => s.fetchedAt);
  const seen = lastSeen(fetchedAt);
  return (
    <View accessibilityRole="alert" accessibilityLabel="Google Calendar problem" style={[{ marginTop: 18, marginHorizontal: size.sideMargin, backgroundColor: c.card, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, style]}>
      <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: c.danger }} />
      <View style={{ flex: 1 }}>
        <AppText style={{ ...font(800), fontSize: 16 }}>{"Can't reach Google Calendar"}</AppText>
        <AppText tone="secondary" style={{ fontSize: 14, lineHeight: 21, marginTop: 4 }}>
          {seen ? `Events after ${seen} may be missing. Your tasks are fine.` : 'Events may be missing. Your tasks are fine.'}
        </AppText>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <PressScale
            accessibilityRole="button"
            onPress={() => connectGoogleCalendar().catch(() => snack({ title: "Couldn't connect Google Calendar", sub: 'Your tasks are fine.' }))}
            style={{ minHeight: 42, paddingHorizontal: 16, borderRadius: 13, backgroundColor: c.accent, justifyContent: 'center' }}
          >
            <AppText style={{ ...font(800), fontSize: 14, color: c.onAccent }}>Sign in again</AppText>
          </PressScale>
          <PressScale
            accessibilityRole="button"
            onPress={() => useCalendar.setState({ failedDismissedOn: todayKey() })}
            style={{ minHeight: 42, paddingHorizontal: 16, borderRadius: 13, backgroundColor: c.ground, justifyContent: 'center' }}
          >
            <AppText tone="secondary" style={{ ...font(700), fontSize: 14 }}>
              Later
            </AppText>
          </PressScale>
        </View>
      </View>
    </View>
  );
}

export { lastSeen };
