import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
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
  weekStart: 0 | 1; // Sunday or Monday
  timeFormat: '24h' | '12h';
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
      morningTime: '08:30',
      afternoonTime: '14:00',
      sortTime: '18:00',
      fullScreen: false,
      weekends: false,
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
