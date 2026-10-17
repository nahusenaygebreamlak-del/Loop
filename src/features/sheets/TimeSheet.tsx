import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { minutesToTime, shortDate, timeRange, timeToMinutes, type DateKey, type TimeKey } from '@/lib/dates';
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

const split = (t: TimeKey) => [Number(t.slice(0, 2)), Math.round(Number(t.slice(3, 5)) / 5) % 12] as const;
const join = (h: number, m: number): TimeKey => `${HOURS[h]}:${MINUTES[m]}`;

/** NTimeSheet: Starts / Ends tiles (the active one outlined), length chips, 5-minute wheel. */
export function TimeSheet({
  start,
  end,
  date,
  onChange,
}: {
  start: TimeKey | null;
  end: TimeKey | null;
  date?: DateKey | null;
  onChange: (start: TimeKey | null, end: TimeKey | null) => void;
}) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const [from, setFrom] = useState<TimeKey>(start ?? '09:00');
  const [length, setLength] = useState<number | null>(start && end ? Math.max(5, timeToMinutes(end) - timeToMinutes(start)) : null);
  const [editing, setEditing] = useState<'start' | 'end'>('start');

  const to = length ? minutesToTime(Math.min(timeToMinutes(from) + length, 23 * 60 + 55)) : null;
  const wheel = editing === 'end' && to ? to : from;
  const [h, m] = split(wheel);
  const setWheel = (t: TimeKey) => {
    if (editing === 'start') setFrom(t);
    else setLength(Math.max(5, timeToMinutes(t) - timeToMinutes(from)));
  };

  const tile = (which: 'start' | 'end', label: string, value: string) => {
    const on = editing === which;
    return (
      <PressScale
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`${label} ${value}`}
        onPress={() => {
          if (which === 'end' && !length) setLength(60);
          setEditing(which);
        }}
        style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: on ? c.tint : c.ground, borderWidth: 2, borderColor: on ? c.accent : 'transparent' }}
      >
        <AppText style={{ ...font(700), fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', color: on ? c.accentText : c.textSecondary }}>{label}</AppText>
        <AppText style={{ ...font(800), fontSize: 22, marginTop: 2, color: value === 'None' ? c.textSecondary : c.text }}>{value}</AppText>
      </PressScale>
    );
  };

  return (
    <SheetCard label="Time" gap={16} style={{ paddingBottom: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 22 }}>
          Time
        </AppText>
        {date ? (
          <AppText tone="secondary" style={{ ...font(700), fontSize: 14 }}>
            {shortDate(date)}
          </AppText>
        ) : null}
      </View>
      <View accessibilityLabel="Start and end" style={{ flexDirection: 'row', gap: 8 }}>
        {tile('start', 'Starts', timeRange(from, null))}
        {tile('end', 'Ends', to ? timeRange(to, null) : 'None')}
      </View>
      <View accessibilityLabel="Length" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LENGTHS.map((l) => (
          <PickChip
            key={l.label}
            big
            label={l.label}
            on={length === l.min}
            onPress={() => {
              setLength(l.min);
              if (!l.min) setEditing('start');
            }}
          />
        ))}
      </View>
      <WheelWell compact>
        <WheelColumn compact key={`h-${editing}`} label={editing === 'start' ? 'Start hour' : 'End hour'} values={HOURS} index={h} onChange={(i) => setWheel(join(i, m))} />
        <AppText style={{ ...font(800), fontSize: 28 }}>:</AppText>
        <WheelColumn compact key={`m-${editing}`} label={editing === 'start' ? 'Start minute' : 'End minute'} values={MINUTES} index={m} onChange={(i) => setWheel(join(h, i))} />
      </WheelWell>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PressScale
          accessibilityRole="button"
          onPress={() => {
            onChange(null, null);
            close();
          }}
          style={{ minHeight: 56, paddingHorizontal: 20, borderRadius: radius.button, backgroundColor: c.ground, justifyContent: 'center' }}
        >
          <AppText tone="secondary" style={{ ...font(700), fontSize: 15 }}>
            No time
          </AppText>
        </PressScale>
        <PressScale
          accessibilityRole="button"
          onPress={() => {
            onChange(from, to);
            close();
          }}
          style={{ flex: 1, minHeight: 56, borderRadius: radius.button, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText variant="button" tone="onAccent">
            Save {timeRange(from, to)}
          </AppText>
        </PressScale>
      </View>
    </SheetCard>
  );
}
