import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { OptionGroup, SheetButton, SheetTitle } from '@/components/ui';
import { fromKey, type DateKey } from '@/lib/dates';
import { describeRule, formatRule, parseRule, type RepeatFreq } from '@/lib/repeat';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { OptionRow } from './parts';

const FREQS: { f: RepeatFreq; label: string }[] = [
  { f: 'never', label: 'Never' },
  { f: 'daily', label: 'Every day' },
  { f: 'weekly', label: 'Every week' },
  { f: 'monthly', label: 'Every month' },
  { f: 'yearly', label: 'Every year' },
];
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** NRepeat */
export function RepeatSheet({ value, start, onChange }: { value: string | null; start: DateKey; onChange: (rule: string | null) => void }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const initial = parseRule(value);
  const [freq, setFreq] = useState<RepeatFreq>(initial.freq);
  const [days, setDays] = useState<number[]>(initial.days.length ? initial.days : [fromKey(start).getDay()]);
  const rule = formatRule({ freq, days });

  return (
    <SheetCard label="Repeat">
      <SheetTitle>Repeat</SheetTitle>
      <OptionGroup label="How often">
        {FREQS.map((o, i) => (
          <OptionRow
            key={o.f}
            label={o.label}
            hint={o.f === 'weekly' && freq === 'weekly' ? 'On the days below' : undefined}
            selected={freq === o.f}
            last={i === FREQS.length - 1}
            onPress={() => setFreq(o.f)}
          />
        ))}
      </OptionGroup>
      {freq === 'weekly' ? (
        <View accessibilityLabel="Days" style={{ flexDirection: 'row', gap: 6 }}>
          {DAY_LETTERS.map((d, i) => {
            const on = days.includes(i);
            return (
              <PressScale
                key={i}
                accessibilityRole="checkbox"
                accessibilityLabel={DAY_NAMES[i]}
                accessibilityState={{ checked: on }}
                onPress={() => setDays((s) => (on ? (s.length > 1 ? s.filter((x) => x !== i) : s) : [...s, i].sort()))}
                style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: on ? c.accent : c.ground, alignItems: 'center', justifyContent: 'center' }}
              >
                <AppText style={{ ...font(700), fontSize: 13.5, color: on ? c.onAccent : c.textSecondary }}>{d}</AppText>
              </PressScale>
            );
          })}
        </View>
      ) : null}
      {rule ? (
        <AppText tone="secondary" style={{ fontSize: 14, textAlign: 'center' }}>
          {describeRule(rule, start)}
        </AppText>
      ) : null}
      <SheetButton
        label="Done"
        onPress={() => {
          onChange(rule);
          close();
        }}
      />
    </SheetCard>
  );
}
