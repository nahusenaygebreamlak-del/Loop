import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { notificationsAllowed } from './setup';

/** Whether Android lets Loop post notifications; re-checked when the app comes back. null while unknown (and on web). */
export function useNotificationsAllowed(): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const check = () => void notificationsAllowed().then(setAllowed);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);
  return allowed;
}
