import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { LoopMarkSvg, LoopWordmark } from '@/components/Brand';
import { PressScale } from '@/components/PressScale';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';

/** WSignIn / WSignInError: blue brand panel with the pitch; Continue with Google (also creates the account). */
export function SignInDesk() {
  const { c, scheme } = useTheme();
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const go = async () => {
    setFailed(false);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.ground }}>
      <View style={{ width: '46%', maxWidth: 662, backgroundColor: c.accent, borderTopRightRadius: 28, borderBottomRightRadius: 28, paddingHorizontal: 56, paddingVertical: 48 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <LoopMarkSvg size={40} color="#FFFFFF" />
          <LoopWordmark width={76} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', gap: 18, maxWidth: 520 }}>
          <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 46, lineHeight: 50, letterSpacing: -1, color: '#FFFFFF' }}>
            Your day, decided in two check-ins.
          </AppText>
          <AppText style={{ fontSize: 17, lineHeight: 26, color: '#DDE7FC' }}>
            Dump thoughts into the Inbox, sort them when it suits you, and let Loop ask about leftovers once in the morning and once in the afternoon.
          </AppText>
          <View style={{ gap: 10, alignItems: 'flex-start', marginTop: 12 }}>
            {['Same account on phone and computer', 'Reads Google Calendar, never writes'].map((t) => (
              <View key={t} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.16)' }}>
                <AppText style={{ ...font(700), fontSize: 13.5, color: '#FFFFFF' }}>{t}</AppText>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 400, maxWidth: '100%', gap: 16 }}>
          <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 30 }}>
            Sign in to Loop
          </AppText>
          <AppText tone="secondary" style={{ fontSize: 15, lineHeight: 23 }}>
            Use the Google account you use on your phone. Everything syncs both ways.
          </AppText>
          {failed ? (
            <View accessibilityRole="alert" style={{ padding: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.dangerTint }}>
              <AppText style={{ fontSize: 14, lineHeight: 21, color: scheme === 'dark' ? c.dangerText : '#9E2A23' }}>
                <AppText style={{ ...font(800), fontSize: 14, color: scheme === 'dark' ? c.dangerText : '#9E2A23' }}>{"Sign-in didn't finish. "}</AppText>
                The Google window was closed before you picked an account. Nothing was changed.
              </AppText>
            </View>
          ) : null}
          <PressScale
            accessibilityRole="button"
            onPress={go}
            disabled={busy}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 56, borderRadius: 18, backgroundColor: c.accent }}
          >
            {busy ? (
              <Spinner color="#FFFFFF" track="rgba(255,255,255,0.3)" />
            ) : (
              <>
                <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                  <AppText style={{ ...font(800), fontSize: 15, color: '#2F6BE3' }}>G</AppText>
                </View>
                <AppText style={{ ...font(800), fontSize: 16, color: c.onAccent }}>{failed ? 'Try again with Google' : 'Continue with Google'}</AppText>
              </>
            )}
          </PressScale>
          <AppText tone="secondary" style={{ fontSize: 13, lineHeight: 20 }}>
            A Google window opens to pick your account. Loop asks for calendar access later, only if you turn it on.
          </AppText>
          <View style={{ height: 1, backgroundColor: c.desk.border, marginVertical: 6 }} />
          <AppText tone="secondary" style={{ fontSize: 13 }}>
            New here? The same button creates your account.
          </AppText>
        </View>
      </View>
    </View>
  );
}
