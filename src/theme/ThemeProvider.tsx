import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
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
  // Default from open question 6: follow the phone.
  const [preference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPref(v);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return {
      scheme,
      c: colors[scheme],
      preference,
      setPreference: (p) => {
        setPref(p);
        AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
      },
    };
  }, [preference, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
