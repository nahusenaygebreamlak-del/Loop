import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { ContentIn } from '@/components/ContentIn';
import { LoopMark } from '@/components/LoopMark';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';

/** NSignIn */
export default function SignIn() {
  const { c } = useTheme();
  const { signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onContinue() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg !== 'cancelled') setError("Couldn't sign in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.ground, paddingTop: insets.top, paddingBottom: 36 + insets.bottom }]}>
      <View style={styles.hero}>
        <ContentIn index={0}>
          <LoopMark />
        </ContentIn>
        <ContentIn index={1}>
          <AppText accessibilityRole="header" style={styles.title}>
            Loop
          </AppText>
        </ContentIn>
        <ContentIn index={2}>
          <AppText tone="secondary" style={styles.lede}>
            Plan your day, and pick it back up anytime. Even after a few days away.
          </AppText>
        </ContentIn>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Continue with Google"
          onPress={onContinue}
          loading={busy}
          icon={
            <View style={[styles.g, { backgroundColor: c.card }]}>
              <AppText style={[styles.gLetter, { color: c.accentText }]}>G</AppText>
            </View>
          }
        />
        {error ? (
          <AppText tone="danger" style={styles.note} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : (
          <AppText tone="secondary" style={styles.note}>
            Your tasks sync between your phone and PC.
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 28 },
  hero: { flexGrow: 1, justifyContent: 'center', gap: 20 },
  title: { ...font(800), fontSize: 40, lineHeight: 44, letterSpacing: -0.8, marginTop: 12 },
  lede: { fontSize: 18, lineHeight: 27, maxWidth: 300 },
  actions: { gap: 12 },
  g: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  gLetter: { ...font(800), fontSize: 15 },
  note: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: 4 },
});
