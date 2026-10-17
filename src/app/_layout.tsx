import {
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SheetProvider } from '@/components/Sheet';
import { SnackbarProvider } from '@/components/Snackbar';
import { AuthProvider, useAuth } from '@/lib/auth';
import { setTimeFormat } from '@/lib/dates';
import { useNotifications } from '@/notifications/useNotifications';
import { useSettings } from '@/store/settings';
import { useHydrated } from '@/store/store';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_300Light,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <SnackbarProvider>
            <SheetProvider>
              <RootStack />
            </SheetProvider>
          </SnackbarProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { c, scheme } = useTheme();
  const { signedIn, loading: authLoading } = useAuth();
  const hydrated = useHydrated();
  const timeFormat = useSettings((s) => s.timeFormat);
  // Times are formatted outside React, so re-render everything when the clock setting changes.
  setTimeFormat(timeFormat);
  const loading = authLoading || !hydrated;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (loading) return null;

  return (
    <>
      {/* Check-ins are scheduled only for a signed-in account (Milestone 5). */}
      {signedIn ? <NotificationsBridge /> : null}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack key={timeFormat} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ground } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Screen name="auth/callback" />
      </Stack>
    </>
  );
}

function NotificationsBridge() {
  useNotifications();
  return null;
}
