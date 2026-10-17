import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { LoopMarkSvg, LoopWordmark } from '@/components/Brand';
import { ContentIn } from '@/components/ContentIn';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';

/** NSignIn, and NSignInError when sign-in fails. */
export default function SignIn() {
  const { c, scheme } = useTheme();
  const { signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onContinue() {
    setFailed(false);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg !== 'cancelled') setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.ground, paddingTop: insets.top, paddingBottom: 36 + insets.bottom }]}>
      <View style={styles.hero}>
        <ContentIn index={0}>
          <LoopMarkSvg size={72} color={c.accent} />
        </ContentIn>
        <ContentIn index={1} style={{ marginTop: 8 }}>
          <LoopWordmark width={132} color={c.text} />
        </ContentIn>
        <ContentIn index={2}>
          <AppText tone="secondary" style={styles.lede}>
            Plan your day, and pick it back up anytime. Even after a few days away.
          </AppText>
        </ContentIn>
      </View>

      <View style={styles.actions}>
        {failed ? (
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.alert, { backgroundColor: c.dangerTint }]}>
            <Icon name="alert" size={18} color={scheme === 'dark' ? c.dangerText : '#9E2A23'} />
            <AppText style={[styles.alertText, { color: scheme === 'dark' ? c.dangerText : '#9E2A23' }]}>{"Couldn't sign in. Check your connection and try again."}</AppText>
          </View>
        ) : null}
        <PrimaryButton
          label={failed ? 'Try again' : 'Continue with Google'}
          onPress={onContinue}
          loading={busy}
          icon={
            <View style={[styles.g, { backgroundColor: c.card }]}>
              <AppText style={[styles.gLetter, { color: c.accentText }]}>G</AppText>
            </View>
          }
        />
        <AppText tone="secondary" style={styles.note}>
          Your tasks sync between your phone and PC.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 28 },
  hero: { flexGrow: 1, justifyContent: 'center', gap: 22 },
  lede: { fontSize: 18, lineHeight: 27, maxWidth: 300 },
  actions: { gap: 12 },
  alert: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16 },
  alertText: { flex: 1, ...font(600), fontSize: 14, lineHeight: 20 },
  g: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  gLetter: { ...font(800), fontSize: 15 },
  note: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: 4 },
});
