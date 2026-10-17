import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { LoopMarkTile } from '@/components/LoopMark';
import { PressScale } from '@/components/PressScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { askForNotifications } from '@/notifications/setup';
import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';
import { font } from '@/theme/typography';

/** NAllowNotif: the permission, explained as the two check-ins. Both buttons continue to the tutorial. */
export default function AllowNotifications() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const next = () => router.replace('/welcome/tutorial');

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: 24 + insets.top, paddingBottom: 28 + insets.bottom, paddingHorizontal: size.sideMargin }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <AppText accessibilityRole="header" style={{ marginTop: 56, ...font(800), fontSize: 32, lineHeight: 38, letterSpacing: -0.64 }}>
          Two short check-ins a day
        </AppText>
        <AppText tone="secondary" style={{ marginTop: 12, fontSize: 16, lineHeight: 25 }}>
          {"Loop brings back what you didn't finish, so nothing piles up quietly. You decide right from the notification."}
        </AppText>
        <View aria-hidden style={{ marginTop: 28, gap: 12 }}>
          <Sample time="08:30" title="2 tasks left from yesterday" body="Move them to today, or mark them done." />
          <Sample time="14:00" title="Halfway there: 3 still open" body="A quick look at what's left today." indent />
        </View>
        <AppText tone="secondary" style={{ marginTop: 22, fontSize: 14, lineHeight: 21 }}>
          You can change the times or turn them off in Settings.
        </AppText>
        <View style={{ flex: 1, minHeight: 24 }} />
      </ScrollView>
      <View style={{ gap: 10 }}>
        <PrimaryButton
          label="Allow notifications"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            await askForNotifications().catch(() => false);
            setBusy(false);
            next();
          }}
        />
        <PressScale accessibilityRole="button" onPress={next} style={{ minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
          <AppText tone="secondary" style={{ ...font(700), fontSize: 15 }}>
            Not now
          </AppText>
        </PressScale>
      </View>
    </View>
  );
}

function Sample({ time, title, body, indent }: { time: string; title: string; body: string; indent?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ marginLeft: indent ? 28 : 0, backgroundColor: c.card, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <LoopMarkTile size={20} />
        <AppText tone="secondary" style={{ ...font(600), fontSize: 12.5 }}>{`Loop · ${time}`}</AppText>
      </View>
      <AppText style={{ ...font(800), fontSize: 15.5 }}>{title}</AppText>
      <AppText tone="secondary" style={{ fontSize: 13.5, lineHeight: 20 }}>
        {body}
      </AppText>
    </View>
  );
}
