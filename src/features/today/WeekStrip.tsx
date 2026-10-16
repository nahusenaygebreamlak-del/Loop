import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { fromKey, weekdayShort, type DateKey } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';

/** VToday week strip: weekday, date, and a dot on days with items. Today is highlighted. */
export function WeekStrip({ days, today, withItems }: { days: DateKey[]; today: DateKey; withItems: Set<DateKey> }) {
  const { c } = useTheme();
  return (
    <View accessibilityLabel="This week" style={{ flexDirection: 'row', paddingTop: 20, paddingHorizontal: 16 }}>
      {days.map((d) => {
        const sel = d === today;
        const has = withItems.has(d);
        return (
          <View
            key={d}
            accessible
            accessibilityLabel={`${weekdayShort(d)} ${fromKey(d).getDate()}${sel ? ', today' : ''}${has ? ', has items' : ''}`}
            style={{ flex: 1, paddingVertical: 6, alignItems: 'center', gap: 6 }}
          >
            <AppText style={{ fontSize: 13, color: sel ? c.accentText : c.textSecondary }}>{weekdayShort(d)}</AppText>
            <AppText style={{ ...font(700), fontSize: 17, color: sel ? c.accentText : c.text }}>{fromKey(d).getDate()}</AppText>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: sel ? c.accent : has ? c.line : 'transparent' }} />
          </View>
        );
      })}
    </View>
  );
}
