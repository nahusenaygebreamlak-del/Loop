import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { setEventHidden } from '@/calendar/google';
import { useStore } from '@/store/store';
import { loadWidgetData } from './data';
import { AddWidget, MonthWidget, TodayWidget } from './LoopWidgets';

/** Renders one widget by name. */
export async function renderLoopWidget(name: string, height: number) {
  if (name === 'LoopAdd') return <AddWidget />;
  const data = await loadWidgetData();
  if (name === 'LoopMonth') return <MonthWidget data={data} />;
  return <TodayWidget data={data} height={height} />;
}

/** Android calls this for widget adds, periodic updates, resizes and taps (even with the app closed). */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, clickAction, clickActionData } = props;
  if (widgetAction === 'WIDGET_DELETED') return;
  if (widgetAction === 'WIDGET_CLICK') {
    const id = clickActionData?.id as string | undefined;
    if (clickAction === 'TOGGLE_TASK' && id) {
      await loadWidgetData();
      useStore.getState().toggleDone(id);
    }
    if (clickAction === 'HIDE_EVENT' && id) await setEventHidden(id, true).catch(() => {});
  }
  props.renderWidget(await renderLoopWidget(widgetInfo.widgetName, widgetInfo.height));
}
