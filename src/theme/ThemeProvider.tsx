import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/store/settings';
import { colors, type ColorScheme, type ThemeColors, type ThemePreference } from './tokens';

const STORAGE_KEY = 'loop.theme';

type ThemeContextValue = {
  scheme: ColorScheme;
  c: ThemeColors;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  // Default from open question 6: follow the phone. Stored with the settings so it syncs with the account.
  const preference = useSettings((s) => s.theme);
  const setPref = (p: ThemePreference) => useSettings.getState().set({ theme: p });

  // One-time move of the Milestone 0 theme key into settings.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark') useSettings.getState().set({ theme: v });
        if (v) AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      })
      .catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return {
      scheme,
      c: colors[scheme],
      preference,
      setPreference: setPref,
    };
  }, [preference, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
