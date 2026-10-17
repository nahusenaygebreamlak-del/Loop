import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Per-device UI memory that doesn't sync.
type Local = {
  /** Tasks that have already shown the "moved 3 times" sheet (NCarriedOver shows once per task). */
  carriedShown: string[];
  /** A task waiting to show that sheet when Today opens. */
  carriedPending: string | null;
};

export const useLocal = create<Local>()(
  persist(() => ({ carriedShown: [], carriedPending: null }) as Local, {
    name: 'loop.local.v1',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

export function markCarriedShown(id: string) {
  const s = useLocal.getState();
  useLocal.setState({ carriedShown: s.carriedShown.includes(id) ? s.carriedShown : [...s.carriedShown, id].slice(-200), carriedPending: s.carriedPending === id ? null : s.carriedPending });
}
