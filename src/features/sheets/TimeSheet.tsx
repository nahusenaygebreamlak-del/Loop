import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { SheetTitle } from '@/components/ui';
import { minutesToTime, timeToMinutes, type TimeKey } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { PickChip, WheelColumn, WheelWell } from './parts';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const LENGTHS: { label: string; min: number | null }[] = [
  { label: 'No end', min: null },
  { label: '30 min', min: 30 },
  { label: '1 hour', min: 60 },
  { label: '2 hours', min: 120 },
];

/** Task time: start wheel + length. Styled after NTimePicker (no dedicated design for task times yet). */
export function TimeSheet({
  start,
  end,
  onChange,
}: {
  start: TimeKey | null;
  end: TimeKey | null;
  onChange: (start: TimeKey | null, end: TimeKey | null) => void;
}) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const initial = start ?? '09:00';
  const [h, setH] = useState(Number(initial.slice(0, 2)));
  const [m, setM] = useState(Math.round(Number(initial.slice(3, 5)) / 5) % 12);
  const initialLength = start && end ? timeToMinutes(end) - timeToMinutes(start) : null;
  const [length, setLength] = useState<number | null>(initialLength);

  const startKey = `${HOURS[h]}:${MINUTES[m]}`;
  const endKey = length ? minutesToTime(timeToMinutes(startKey) + length) : null;
  const custom = length != null && !LENGTHS.some((l) => l.min === length);

  return (
    <SheetCard label="Time" gap={18} style={{ paddingBottom: 28 }}>
      <SheetTitle>Time</SheetTitle>
      <View accessibilityLabel="Length" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LENGTHS.map((l) => (
          <PickChip key={l.label} big label={l.label} on={length === l.min} onPress={() => setLength(l.min)} />
        ))}
        {custom ? <PickChip big label={`Until ${endKey}`} on onPress={() => {}} /> : null}
      </View>
      <WheelWell>
        <WheelColumn label="Hour" values={HOURS} index={h} onChange={setH} />
        <AppText style={{ ...font(800), fontSize: 28 }}>:</AppText>
        <WheelColumn label="Minute" values={MINUTES} index={m} onChange={setM} />
      </WheelWell>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {start ? (
          <PressScale
            accessibilityRole="button"
            onPress={() => {
              onChange(null, null);
              close();
            }}
            style={{ minHeight: 56, paddingHorizontal: 20, borderRadius: radius.button, backgroundColor: c.ground, justifyContent: 'center' }}
          >
            <AppText tone="danger" style={{ ...font(700), fontSize: 15 }}>
              No time
            </AppText>
          </PressScale>
        ) : null}
        <PressScale
          accessibilityRole="button"
          onPress={() => {
            onChange(startKey, endKey);
            close();
          }}
          style={{ flex: 1, minHeight: 56, borderRadius: radius.button, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText variant="button" tone="onAccent">
            Save {endKey ? `${startKey} – ${endKey}` : startKey}
          </AppText>
        </PressScale>
      </View>
    </SheetCard>
  );
}
