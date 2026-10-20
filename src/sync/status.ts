import { Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useSyncStatus } from './engine';

/** One line for the side menu and Account: "Synced just now", "Offline · changes will sync later"… */
export function useSyncLine(): { line: string; tone: 'secondary' | 'syncing' | 'warn' } {
  const { session } = useAuth();
  const { state, lastSyncedAt, pending } = useSyncStatus();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!session || state === 'off') return { line: Platform.OS === 'web' ? 'Saved on this computer' : 'Saved on this phone', tone: 'secondary' };
  if (state === 'offline') return { line: 'Offline · changes will sync later', tone: 'secondary' };
  if (state === 'error') return { line: "Can't sync right now · your tasks are fine", tone: 'warn' };
  if (state === 'syncing' && !lastSyncedAt) return { line: 'Syncing…', tone: 'syncing' };
  if (pending && state !== 'synced') return { line: 'Syncing…', tone: 'syncing' };
  return { line: `Synced ${ago(lastSyncedAt)}`, tone: 'secondary' };
}

export function ago(iso: string | null): string {
  if (!iso) return 'just now';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
}
