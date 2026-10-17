import { Appearance } from 'react-native';
import { useCalendar } from '@/calendar/google';
import { formatTime, setTimeFormat, todayKey, type DateKey } from '@/lib/dates';
import { eventsOn, eventStart } from '@/lib/events';
import { isLive, visibleTasks } from '@/lib/taskViews';
import { phoneTimeFormat, useSettings } from '@/store/settings';
import { useStore, whenHydrated } from '@/store/store';

// What the home-screen widgets show (VWidgets). Read straight from the saved stores,
// because widgets render in the background without the app open.

export type WidgetColors = {
  card: `#${string}`;
  text: `#${string}`;
  secondary: `#${string}`;
  line: `#${string}`;
  hair: `#${string}`;
  accent: `#${string}`;
  accentText: `#${string}`;
  tint: `#${string}`;
  muted: `#${string}`;
  has: `#${string}`;
  high: `#${string}`;
  medium: `#${string}`;
  low: `#${string}`;
};

const LIGHT: WidgetColors = { card: '#FFFFFF', text: '#141A2E', secondary: '#636B80', line: '#C9D2E3', hair: '#F2F4F9', accent: '#2F6BE3', accentText: '#2F6BE3', tint: '#DCE6FB', muted: '#C9D2E3', has: '#2F6BE3', high: '#C7372F', medium: '#D4A017', low: '#2F6BE3' };
const DARK: WidgetColors = { card: '#1A2030', text: '#E8ECF5', secondary: '#9AA3B8', line: '#3A4357', hair: '#0F1320', accent: '#2F6BE3', accentText: '#7AA2FF', tint: '#1E2D52', muted: '#3A4357', has: '#7AA2FF', high: '#FF7D72', medium: '#D4A017', low: '#7AA2FF' };

export type WidgetRow = { id: string; kind: 'task' | 'event'; time: string | null; title: string; done: boolean; now: boolean; ring: `#${string}` };

const settingsReady = () =>
  new Promise<void>((resolve) => {
    if (useSettings.persist.hasHydrated()) return resolve();
    const unsub = useSettings.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });

export async function loadWidgetData() {
  await Promise.all([whenHydrated(), settingsReady(), useCalendar.persist.hasHydrated() ? Promise.resolve() : useCalendar.persist.rehydrate()]);
  const s = useSettings.getState();
  setTimeFormat(s.timeFormatChosen ? s.timeFormat : phoneTimeFormat());
  const scheme = s.theme === 'system' ? (Appearance.getColorScheme() ?? 'light') : s.theme;
  const colors = scheme === 'dark' ? DARK : LIGHT;
  const { tasks: all, lists } = useStore.getState();
  const tasks = visibleTasks(all, lists);
  const today = todayKey();
  const cal = useCalendar.getState();
  const connected = cal.status === 'connected' || cal.status === 'failed';

  const todays = tasks.filter((t) => isLive(t) && t.dueDate === today);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const ringFor = (p: number) => (p === 3 ? colors.high : p === 2 ? colors.medium : p === 1 ? colors.low : colors.line);
  const taskRows: WidgetRow[] = todays.map((t) => {
    const start = t.startTime ? Number(t.startTime.slice(0, 2)) * 60 + Number(t.startTime.slice(3)) : null;
    const end = t.endTime ? Number(t.endTime.slice(0, 2)) * 60 + Number(t.endTime.slice(3)) : start != null ? start + 60 : null;
    return { id: t.id, kind: 'task', time: t.startTime, title: t.title, done: !!t.doneAt, now: !t.doneAt && start != null && nowMin >= start && nowMin < end!, ring: ringFor(t.priority) };
  });
  const eventRows: WidgetRow[] = connected
    ? eventsOn(cal.events, today, cal.hidden)
        .filter((e) => !e.allDay)
        .map((e) => ({ id: e.id, kind: 'event', time: eventStart(e), title: e.title, done: false, now: false, ring: colors.line }))
    : [];
  const rows = [...taskRows, ...eventRows].sort((a, b) => Number(a.done) - Number(b.done) || (a.time ?? '99').localeCompare(b.time ?? '99'));

  const busy = new Set<DateKey>([...tasks.filter((t) => isLive(t) && !t.doneAt && t.dueDate).map((t) => t.dueDate!)]);
  return {
    colors,
    today,
    rows,
    done: todays.filter((t) => t.doneAt).length,
    total: todays.length,
    openToday: todays.filter((t) => !t.doneAt).length,
    busy,
    weekStart: s.weekStart,
    time: (t: string) => formatTime(t),
  };
}

export type WidgetData = Awaited<ReturnType<typeof loadWidgetData>>;
