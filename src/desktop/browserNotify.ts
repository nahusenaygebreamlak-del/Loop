import { useEffect } from 'react';
import { Platform } from 'react-native';
import { pushSnack } from '@/components/Snackbar';
import { goMain } from '@/features/nav';
import { applyChoices, leftovers, nameList } from '@/lib/checkins';
import { todayKey } from '@/lib/dates';
import { isOpen, visibleTasks } from '@/lib/taskViews';
import { useLocal } from '@/store/local';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';

// Computer check-ins (docs/11): never a pop-up in the page. A browser notification is sent only
// when Loop is open in a background tab and the person allowed it (Settings › Browser notifications).

export type BrowserPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function browserPermission(): BrowserPermission {
  if (Platform.OS !== 'web' || typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function askBrowserPermission(): Promise<BrowserPermission> {
  if (browserPermission() === 'unsupported') return 'unsupported';
  const p = await Notification.requestPermission();
  if (p === 'granted') useLocal.setState({ browserNotify: true });
  return p;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/loop-sw.js');
  } catch {
    return null;
  }
}

const moveAll = () => {
  const today = todayKey();
  const { tasks, lists } = useStore.getState();
  const left = leftovers(tasks, lists, today);
  if (!left.length) return;
  const { next, prev } = applyChoices(tasks, Object.fromEntries(left.map((t) => [t.id, 'today' as const])), today, new Date().toISOString());
  useStore.getState().applyCheckin(next);
  goMain('/');
  pushSnack({ title: `Moved ${left.length} task${left.length === 1 ? '' : 's'} to today`, actions: [{ label: 'Undo', onPress: () => useStore.getState().applyCheckin(prev) }] });
};

/** Sends the morning / afternoon check-in as a browser notification while Loop is in a background tab. */
export function useBrowserCheckins() {
  useEffect(() => {
    if (Platform.OS !== 'web' || browserPermission() === 'unsupported') return;
    let reg: ServiceWorkerRegistration | null = null;
    void registration().then((r) => (reg = r));
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'checkin-all') moveAll();
      if (e.data?.type === 'checkin-open') goMain('/');
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    const tick = () => {
      if (!document.hidden || browserPermission() !== 'granted' || useLocal.getState().browserNotify === false) return;
      const s = useSettings.getState();
      const now = new Date();
      const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = todayKey();
      const weekend = now.getDay() === 0 || now.getDay() === 6;
      if (weekend && !s.weekends) return;
      const sent = (k: string) => localStorage.getItem(`loop.browserNotif.${k}`) === today;
      const mark = (k: string) => localStorage.setItem(`loop.browserNotif.${k}`, today);
      const { tasks, lists } = useStore.getState();
      const show = (title: string, body: string, actions: { action: string; title: string }[]) => {
        const opts = { body, icon: '/favicon.ico', tag: 'loop-checkin', actions } as NotificationOptions & { actions: { action: string; title: string }[] };
        if (reg) void reg.showNotification(title, opts);
        else new Notification(title, { body });
      };
      if (s.morningTime && hm >= s.morningTime && !sent('morning')) {
        mark('morning');
        const left = leftovers(tasks, lists, today);
        if (left.length)
          show(`Morning check-in: ${left.length} task${left.length === 1 ? '' : 's'} left from yesterday`, nameList(left.map((t) => t.title)), [
            { action: 'all', title: 'Move all to today' },
            { action: 'decide', title: 'Decide in Loop' },
          ]);
      }
      if (s.afternoonTime && hm >= s.afternoonTime && !sent('afternoon')) {
        mark('afternoon');
        const open = visibleTasks(tasks, lists).filter((t) => isOpen(t) && t.dueDate === today);
        if (open.length) show(`Halfway there: ${open.length} still open`, nameList(open.map((t) => t.title)), [{ action: 'decide', title: 'Open Today' }]);
      }
    };
    const timer = setInterval(tick, 30_000);
    return () => {
      clearInterval(timer);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);
}
