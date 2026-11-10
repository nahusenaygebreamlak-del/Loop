import { Pressable, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { pushSnack } from '@/components/Snackbar';
import { useCloseSheet } from '@/components/Sheet';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { Kbd } from './Kbd';
import { browserName, isMac, promptInstall, useInstallState } from './platform';

/** WCInstall: how to keep Loop as an app on this computer. Open with sheets.open(…, 'dialog'). */
export function InstallDialog() {
  const { c } = useTheme();
  const close = useCloseSheet();
  const { browser, canPrompt } = useInstallState();
  const home = isMac ? 'Dock' : 'taskbar';

  const steps: string[] =
    browser === 'safari'
      ? ['In the menu bar at the top of the screen, click File.', 'Choose Add to Dock.', 'Click Add. Loop now opens from the Dock in its own window.']
      : browser === 'chromium'
        ? ['Click the install icon at the right end of the address bar.', 'Click Install.', `Loop opens in its own window. Keep it in the ${home} to find it again.`]
        : [];

  return (
    <View accessibilityRole="alert" style={{ width: 460, maxWidth: '100%', backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.desk.border, padding: 26, gap: 16 }}>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 21 }}>
        Use Loop as an app
      </AppText>
      {steps.length ? (
        <>
          <AppText tone="secondary" style={{ fontSize: 14.5, lineHeight: 22 }}>
            Loop gets its own icon and window, and opens without a connection. Your account and tasks stay the same.
          </AppText>
          <View accessibilityRole="list" style={{ gap: 10 }}>
            {steps.map((text, i) => (
              <View key={text} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View aria-hidden style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <AppText style={{ ...font(800), fontSize: 13, color: c.accentText }}>{i + 1}</AppText>
                </View>
                <AppText accessibilityLabel={`Step ${i + 1}. ${text}`} style={{ flex: 1, fontSize: 15, lineHeight: 22, paddingTop: 2 }}>
                  {text}
                </AppText>
              </View>
            ))}
          </View>
          <AppText tone="secondary" style={{ fontSize: 13, lineHeight: 19 }}>
            {browser === 'safari' ? 'Needs macOS Sonoma or later.' : `No install icon? Open the ${browserName} menu (⋮) and look for “Install Loop”.`}
          </AppText>
        </>
      ) : (
        <AppText tone="secondary" style={{ fontSize: 14.5, lineHeight: 22 }}>
          Your browser can’t install apps. Use Safari or Chrome.
        </AppText>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        {canPrompt ? (
          <>
            <Pressable accessibilityRole="button" onPress={close} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.ground }}>
              <AppText style={{ ...font(800), fontSize: 14.5 }}>Not now</AppText>
              <Kbd k="Esc" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                close();
                if (await promptInstall()) pushSnack({ title: 'Loop is installed' });
              }}
              style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.accent, justifyContent: 'center' }}
            >
              <AppText style={{ ...font(800), fontSize: 14.5, color: c.onAccent }}>Install Loop</AppText>
            </Pressable>
          </>
        ) : (
          <Pressable accessibilityRole="button" onPress={close} style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.accent, justifyContent: 'center' }}>
            <AppText style={{ ...font(800), fontSize: 14.5, color: c.onAccent }}>Got it</AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}
