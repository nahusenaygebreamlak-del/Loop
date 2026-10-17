import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getCalendars } from 'expo-localization';
import type { TimeKey } from '@/lib/dates';

// Device settings (NSettings2). Mirrors the profile columns; synced to Supabase in Milestone 4.
// A null time means that check-in is turned off.

export type Settings = {
  theme: 'system' | 'light' | 'dark';
  morningTime: TimeKey | null;
  afternoonTime: TimeKey | null;
  sortTime: TimeKey | null;
  fullScreen: boolean;
  weekends: boolean;
  /** An unanswered morning check-in repeats every 15 minutes (up to an hour). */
  remindUntilAct: boolean;
  weekStart: 0 | 1; // Sunday or Monday
  timeFormat: '24h' | '12h';
  /** False until the clock is picked in Week and time; until then Loop follows the phone's 12/24-hour setting. */
  timeFormatChosen?: boolean;
  recentSearches: string[];
};

type Actions = {
  set: (patch: Partial<Settings>) => void;
  addRecentSearch: (q: string) => void;
};

export const useSettings = create<Settings & Actions>()(
  persist(
    (set) => ({
      theme: 'system',
      // Off until "Meet the check-ins" / "Want a nudge to sort these?" turn them on (spec §8).
      morningTime: null,
      afternoonTime: null,
      sortTime: null,
      fullScreen: false,
      weekends: false,
      remindUntilAct: false,
      weekStart: 0,
      timeFormat: '24h',
      recentSearches: [],
      set: (patch) => set(patch),
      addRecentSearch: (q) =>
        set((s) => {
          const clean = q.trim();
          if (!clean) return s;
          return { recentSearches: [clean, ...s.recentSearches.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, 6) };
        }),
    }),
    {
      name: 'loop.settings.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set: _s, addRecentSearch: _a, ...rest }) => rest,
    },
  ),
);

/** The phone's own clock setting (12- or 24-hour). */
export function phoneTimeFormat(): '24h' | '12h' {
  try {
    const uses24 = getCalendars()[0]?.uses24hourClock;
    if (uses24 != null) return uses24 ? '24h' : '12h';
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 ? '12h' : '24h';
  } catch {
    return '24h';
  }
}

/** The clock Loop shows: the picked one, or the phone's. */
export const useTimeFormat = () => useSettings((s) => (s.timeFormatChosen ? s.timeFormat : phoneTimeFormat()));
