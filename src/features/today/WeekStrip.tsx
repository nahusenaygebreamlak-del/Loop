import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressScale } from '@/components/PressScale';
import { addDays, fromKey, weekOf, weekdayLong, weekdayShort, type DateKey } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';

const RANGE = 52; // weeks either side of this week

/**
 * Today's week strip (VToday, NTodayOtherDay): tap a day to show it, swipe for other weeks.
 * Today is accent text; a picked other day is a solid accent pill. Dots mark days with items.
 */
export function WeekStrip({
  today,
  selected,
  weekStart,
  hasItems,
  onSelect,
}: {
  today: DateKey;
  selected: DateKey;
  weekStart: number;
  hasItems: (d: DateKey) => boolean;
  onSelect: (d: DateKey) => void;
}) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const list = useRef<FlatList<number>>(null);
  const thisWeek = weekOf(today, weekStart)[0];
  const pages = useMemo(() => Array.from({ length: RANGE * 2 + 1 }, (_, i) => i - RANGE), []);
  const pageOf = (d: DateKey) => RANGE + Math.round((fromKey(weekOf(d, weekStart)[0]).getTime() - fromKey(thisWeek).getTime()) / (7 * 86_400_000));

  // Follow the selection (e.g. "Back to today" from another week).
  const selectedPage = pageOf(selected);
  useEffect(() => {
    if (width) list.current?.scrollToIndex({ index: selectedPage, animated: true });
  }, [selectedPage, width]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ paddingTop: 20 }}>
      {width ? (
        <FlatList
          ref={list}
          data={pages}
          keyExtractor={(n) => String(n)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={selectedPage}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          accessibilityLabel="Week. Swipe for other weeks."
          renderItem={({ item: n }) => (
            <View style={{ width, flexDirection: 'row', paddingHorizontal: 16 }}>
              {Array.from({ length: 7 }, (_, i) => addDays(thisWeek, n * 7 + i)).map((d) => {
                const isToday = d === today;
                const isSel = d === selected && !isToday;
                const fg = isSel ? c.onAccent : isToday ? c.accentText : c.text;
                const dot = isSel ? c.onAccent : isToday ? c.accent : hasItems(d) ? c.line : 'transparent';
                return (
                  <PressScale
                    key={d}
                    accessibilityRole="button"
                    accessibilityState={{ selected: d === selected }}
                    accessibilityLabel={`${weekdayLong(d)} ${fromKey(d).getDate()}${isToday ? ', today' : ''}${hasItems(d) ? ', has items' : ''}`}
                    onPress={() => onSelect(d)}
                    style={{ flex: 1, paddingVertical: 6, alignItems: 'center', gap: 6, borderRadius: 14, backgroundColor: isSel ? c.accent : 'transparent' }}
                  >
                    <AppText style={{ fontSize: 13, color: isSel ? c.onAccentSecondary : isToday ? c.accentText : c.textSecondary }}>{weekdayShort(d)}</AppText>
                    <AppText style={{ ...font(700), fontSize: 17, color: fg }}>{fromKey(d).getDate()}</AppText>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: dot }} />
                  </PressScale>
                );
              })}
            </View>
          )}
        />
      ) : (
        <View style={{ height: 70 }} />
      )}
    </View>
  );
}
