import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { useCalendar } from '@/calendar/google';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import { renderLoopWidget } from './handler';

const NAMES = ['LoopToday', 'LoopMonth'];
let timer: ReturnType<typeof setTimeout> | null = null;

/** Redraws the home-screen widgets shortly after tasks, settings or events change. */
export function refreshWidgets() {
  if (Platform.OS !== 'android') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    for (const widgetName of NAMES) {
      void requestWidgetUpdate({ widgetName, renderWidget: (info) => renderLoopWidget(widgetName, info.height) }).catch(() => {});
    }
  }, 800);
}

let installed = false;
export function installWidgetUpdates() {
  if (installed || Platform.OS !== 'android') return;
  installed = true;
  useStore.subscribe((n, p) => n.tasks !== p.tasks && refreshWidgets());
  useSettings.subscribe(refreshWidgets);
  useCalendar.subscribe((n, p) => (n.events !== p.events || n.hidden !== p.hidden) && refreshWidgets());
  refreshWidgets();
}
