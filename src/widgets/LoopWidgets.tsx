import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { fromKey, monthDay, monthGrid, monthName, weekOf, weekdayLong, weekdayShort } from '@/lib/dates';
import type { WidgetData } from './data';

// VWidgets: Today list, mini month, and Add task. Rendered by the widget task handler.

const F600 = 'PlusJakartaSans_600SemiBold';
const F700 = 'PlusJakartaSans_700Bold';
const F800 = 'PlusJakartaSans_800ExtraBold';
const ADD_URI = 'loop:///?add=1';

const plus = (color: string, size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M12 5v14M5 12h14" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/></svg>`;
const tick = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Today: date, "1 of 6 done", +, then the day's tasks and events; tick marks a task done (or hides an event). */
export function TodayWidget({ data, height }: { data: WidgetData; height: number }) {
  const { colors: c, rows, done, total, today } = data;
  const fit = Math.max(1, Math.floor((height - 84) / 44));
  const shown = rows.slice(0, fit);
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c.card, borderRadius: 28, paddingTop: 16, paddingBottom: 8, paddingLeft: 20, paddingRight: 14, flexDirection: 'column' }} clickAction="OPEN_APP">
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text={`${weekdayLong(today)}, ${monthDay(today)}`} style={{ fontSize: 12.5, fontFamily: F600, color: c.secondary }} />
          <TextWidget text="Today" style={{ fontSize: 20, fontFamily: F800, color: c.text }} />
        </FlexWidget>
        {total ? (
          <FlexWidget style={{ backgroundColor: c.tint, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginRight: 10 }}>
            <TextWidget text={`${done} of ${total} done`} style={{ fontSize: 12.5, fontFamily: F700, color: c.accentText }} />
          </FlexWidget>
        ) : null}
        <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: ADD_URI }} accessibilityLabel="Add task" style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: c.accent, justifyContent: 'center', alignItems: 'center' }}>
          <SvgWidget svg={plus('#FFFFFF', 22)} style={{ width: 22, height: 22 }} />
        </FlexWidget>
      </FlexWidget>
      {shown.length === 0 ? (
        <FlexWidget style={{ width: 'match_parent', flex: 1, justifyContent: 'center' }}>
          <TextWidget text="A clear day. Tap + to add something." style={{ fontSize: 14, fontFamily: F600, color: c.secondary }} />
        </FlexWidget>
      ) : null}
      {shown.map((r, i) => (
        <FlexWidget key={r.id} style={{ width: 'match_parent', height: 44, flexDirection: 'row', alignItems: 'center', borderBottomWidth: i < shown.length - 1 ? 1 : 0, borderBottomColor: c.hair }}>
          <TextWidget text={r.time ? data.time(r.time) : ''} style={{ width: 52, fontSize: 12.5, fontFamily: F600, color: r.now ? c.accentText : c.secondary }} />
          <FlexWidget style={{ flex: 1 }} clickAction="OPEN_URI" clickActionData={{ uri: r.kind === 'task' ? `loop:///task/${r.id}` : 'loop:///calendar' }}>
            <TextWidget text={r.title} maxLines={1} truncate="END" style={{ fontSize: 14.5, fontFamily: F700, color: r.done ? c.secondary : c.text }} />
          </FlexWidget>
          <FlexWidget
            clickAction={r.kind === 'task' ? 'TOGGLE_TASK' : 'HIDE_EVENT'}
            clickActionData={{ id: r.id }}
            accessibilityLabel={r.done ? `Mark not done: ${r.title}` : `Mark done: ${r.title}`}
            style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }}
          >
            {r.done ? (
              <FlexWidget style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.accent, justifyContent: 'center', alignItems: 'center' }}>
                <SvgWidget svg={tick} style={{ width: 14, height: 14 }} />
              </FlexWidget>
            ) : (
              <FlexWidget style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: r.ring }} />
            )}
          </FlexWidget>
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

/** Mini month: days with open tasks in blue, today as a solid blue square. Tap opens the Calendar. */
export function MonthWidget({ data }: { data: WidgetData }) {
  const { colors: c, today, busy, weekStart, openToday } = data;
  const d = fromKey(today);
  const cells = monthGrid(d.getFullYear(), d.getMonth(), weekStart);
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const heads = weekOf(today, weekStart).map((k) => weekdayShort(k)[0]);
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'loop:///calendar' }} style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c.card, borderRadius: 28, padding: 12, flexDirection: 'column' }}>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 4 }}>
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget text={monthName(d.getMonth())} style={{ fontSize: 15, fontFamily: F800, color: c.text }} />
        </FlexWidget>
        <TextWidget text={`${openToday} today`} style={{ fontSize: 11.5, fontFamily: F700, color: c.secondary }} />
      </FlexWidget>
      {[heads.map((h, i) => ({ key: `h${i}`, label: h, head: true, inMonth: true, sel: false, has: false })), ...weeks.map((w) => w.map((cell) => ({ key: cell.key, label: String(fromKey(cell.key).getDate()), head: false, inMonth: cell.inMonth, sel: cell.key === today, has: busy.has(cell.key) })))].map((row, r) => (
        <FlexWidget key={r} style={{ width: 'match_parent', flex: 1, flexDirection: 'row' }}>
          {row.map((cell) => (
            <FlexWidget key={cell.key} style={{ flex: 1, height: 'match_parent', justifyContent: 'center', alignItems: 'center' }}>
              <FlexWidget style={{ width: 22, height: 20, borderRadius: 7, backgroundColor: cell.sel ? c.accent : '#00000000', justifyContent: 'center', alignItems: 'center' }}>
                <TextWidget
                  text={cell.label}
                  style={{ fontSize: 11.5, fontFamily: F700, color: cell.sel ? '#FFFFFF' : cell.head ? c.secondary : !cell.inMonth ? c.muted : cell.has ? c.has : c.text }}
                />
              </FlexWidget>
            </FlexWidget>
          ))}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

/** Add task: opens quick add. */
export function AddWidget() {
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: ADD_URI }} accessibilityLabel="Add task or dump a note" style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#2F6BE3', borderRadius: 28, padding: 18, flexDirection: 'column', justifyContent: 'space-between' }}>
      <FlexWidget style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <SvgWidget svg={plus('#2F6BE3', 26)} style={{ width: 26, height: 26 }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text="Add task" style={{ fontSize: 18, fontFamily: F800, color: '#FFFFFF' }} />
        <TextWidget text="or dump a note" style={{ fontSize: 13, fontFamily: F600, color: '#DDE7FC', marginTop: 4 }} />
      </FlexWidget>
    </FlexWidget>
  );
}

