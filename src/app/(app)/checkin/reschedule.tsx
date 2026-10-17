import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { PressScale } from '@/components/PressScale';
import { useSheets } from '@/components/Sheet';
import { IconButton } from '@/components/ui';
import { finishCheckin } from '@/features/checkin';
import { goBack } from '@/features/nav';
import { DateSheet } from '@/features/sheets/DateSheet';
import { applyChoices, leftovers, type Choice } from '@/lib/checkins';
import { addDays, shortDate, todayKey } from '@/lib/dates';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

const OPTIONS: { key: Exclude<Choice, { date: string }> | 'pick'; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'nextWeek', label: 'Next week' },
  { key: 'pick', label: 'Pick date' },
  { key: 'someday', label: 'Someday' },
  { key: 'done', label: 'Done' },
];

/** VCheckInReschedule: one decision per leftover. Tasks left unset stay where they are. */
export default function Reschedule() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const tasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const today = todayKey();
  const [left] = useState(() => leftovers(tasks, lists, today));
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const setCount = Object.keys(choices).length;

  const pick = (id: string) =>
    sheets.open(() => (
      <DateSheet
        value={{ dueDate: addDays(today, 2), startTime: null, endTime: null, reminderMinutes: null, repeatRule: null }}
        onChange={(v) => v.dueDate && setChoices((s) => ({ ...s, [id]: { date: v.dueDate! } }))}
      />
    ));

  const save = () => {
    const { next, prev } = applyChoices(tasks, choices, today, new Date().toISOString());
    finishCheckin(next, prev);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <View style={{ paddingTop: 18 + insets.top, paddingLeft: 14, paddingRight: size.sideMargin }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="back" label="Back" onPress={goBack} />
          <AppText tone="secondary" style={{ ...font(600), fontSize: 14 }} accessibilityLiveRegion="polite">
            {setCount} of {left.length} set
          </AppText>
        </View>
        <AppText variant="title" accessibilityRole="header" style={{ marginTop: 12, marginLeft: 10, lineHeight: 37 }}>
          Reschedule
        </AppText>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 20, paddingHorizontal: size.sideMargin, gap: 12 }}>
        {left.map((t) => {
          const chosen = choices[t.id];
          return (
            <View key={t.id} style={{ backgroundColor: c.card, borderRadius: radius.card, paddingVertical: 16, paddingLeft: 20, paddingRight: 16, gap: 12 }}>
              <AppText style={{ ...font(700), fontSize: 15.5 }}>{t.title}</AppText>
              <View accessibilityRole="radiogroup" accessibilityLabel={`When for ${t.title}`} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {OPTIONS.map((o) => {
                  const on = o.key === 'pick' ? typeof chosen === 'object' : chosen === o.key;
                  const label = o.key === 'pick' && typeof chosen === 'object' ? shortDate(chosen.date) : o.label;
                  return (
                    <PressScale
                      key={o.key}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      hitSlop={4}
                      onPress={() => (o.key === 'pick' ? pick(t.id) : setChoices((s) => ({ ...s, [t.id]: o.key as Choice })))}
                      style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 11, justifyContent: 'center', backgroundColor: on ? c.accent : c.ground }}
                    >
                      <AppText style={{ ...font(on ? 700 : 600), fontSize: 13.5, color: on ? c.onAccent : c.textSecondary }}>{label}</AppText>
                    </PressScale>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={{ paddingTop: 16, paddingHorizontal: size.sideMargin, paddingBottom: 28 + insets.bottom }}>
        <PressScale
          accessibilityRole="button"
          accessibilityState={{ disabled: !setCount }}
          disabled={!setCount}
          onPress={save}
          style={{ minHeight: 58, borderRadius: radius.button, backgroundColor: setCount ? c.accent : c.line, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText variant="button" tone="onAccent">
            Save and see today
          </AppText>
        </PressScale>
      </View>
    </View>
  );
}
