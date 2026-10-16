import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { OptionGroup, SheetButton, SheetTitle } from '@/components/ui';
import type { TimeKey } from '@/lib/dates';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemePreference } from '@/theme/tokens';
import { radius } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { OptionRow, PickChip, WheelColumn, WheelWell } from './parts';

export type CheckinKind = 'morningTime' | 'afternoonTime' | 'sortTime';

const CHECKIN: Record<CheckinKind, { title: string; hint: string; picks: TimeKey[]; fallback: TimeKey }> = {
  morningTime: { title: 'Morning check-in', hint: "Pick a time you're usually up but haven't started work.", picks: ['07:30', '08:30', '09:00'], fallback: '08:30' },
  afternoonTime: { title: 'Afternoon check-in', hint: 'Only sent if something is still open today.', picks: ['13:00', '14:00', '15:30'], fallback: '14:00' },
  sortTime: { title: 'Inbox sort reminder', hint: 'Only sent when the Inbox has notes.', picks: ['12:00', '18:00', '21:00'], fallback: '18:00' },
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

/** NTimePicker: quick picks, wheel, Turn off / Save. */
export function CheckinTimeSheet({ kind }: { kind: CheckinKind }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const current = useSettings((s) => s[kind]);
  const set = useSettings((s) => s.set);
  const cfg = CHECKIN[kind];
  const start = current ?? cfg.fallback;
  const [h, setH] = useState(Number(start.slice(0, 2)));
  const [m, setM] = useState(Math.max(0, MINUTES.indexOf(start.slice(3, 5))));
  const value = `${HOURS[h]}:${MINUTES[m]}`;

  return (
    <SheetCard label={cfg.title} gap={18} style={{ paddingBottom: 28 }}>
      <SheetTitle hint={cfg.hint}>{cfg.title}</SheetTitle>
      <View accessibilityLabel="Quick picks" style={{ flexDirection: 'row', gap: 8 }}>
        {cfg.picks.map((p) => (
          <PickChip
            key={p}
            big
            label={p}
            on={p === value}
            onPress={() => {
              setH(Number(p.slice(0, 2)));
              setM(MINUTES.indexOf(p.slice(3, 5)));
            }}
          />
        ))}
      </View>
      <WheelWell>
        <WheelColumn label="Hour" values={HOURS} index={h} onChange={setH} />
        <AppText style={{ ...font(800), fontSize: 28 }}>:</AppText>
        <WheelColumn label="Minute" values={MINUTES} index={m} onChange={setM} />
      </WheelWell>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PressScale
          accessibilityRole="button"
          onPress={() => {
            set({ [kind]: null });
            close();
          }}
          style={{ minHeight: 56, paddingHorizontal: 20, borderRadius: radius.button, backgroundColor: c.ground, justifyContent: 'center' }}
        >
          <AppText tone="danger" style={{ ...font(700), fontSize: 15 }}>
            Turn off
          </AppText>
        </PressScale>
        <PressScale
          accessibilityRole="button"
          onPress={() => {
            set({ [kind]: value });
            close();
          }}
          style={{ flex: 1, minHeight: 56, borderRadius: radius.button, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText variant="button" tone="onAccent">
            Save {value}
          </AppText>
        </PressScale>
      </View>
    </SheetCard>
  );
}

export const THEME_LABEL: Record<ThemePreference, string> = { light: 'Light', dark: 'Dark', system: 'Follow the phone' };

/** Theme: Light, Dark or follow the phone. */
export function ThemeSheet() {
  const close = useCloseSheet();
  const { preference, setPreference } = useTheme();
  const options: ThemePreference[] = ['light', 'dark', 'system'];
  return (
    <SheetCard label="Theme" style={{ paddingBottom: 28 }}>
      <SheetTitle>Theme</SheetTitle>
      <OptionGroup label="Theme">
        {options.map((o, i) => (
          <OptionRow
            key={o}
            label={THEME_LABEL[o]}
            selected={preference === o}
            last={i === options.length - 1}
            onPress={() => {
              setPreference(o);
              close();
            }}
          />
        ))}
      </OptionGroup>
    </SheetCard>
  );
}

/** Week and time: week start and 12/24-hour clock. */
export function WeekTimeSheet() {
  const close = useCloseSheet();
  const s = useSettings();
  const [weekStart, setWeekStart] = useState(s.weekStart);
  const [timeFormat, setTimeFormat] = useState(s.timeFormat);
  return (
    <SheetCard label="Week and time" style={{ paddingBottom: 28 }}>
      <SheetTitle>Week and time</SheetTitle>
      <AppText variant="label" tone="secondary">
        Week starts on
      </AppText>
      <OptionGroup label="Week starts on">
        <OptionRow label="Sunday" selected={weekStart === 0} onPress={() => setWeekStart(0)} />
        <OptionRow label="Monday" selected={weekStart === 1} last onPress={() => setWeekStart(1)} />
      </OptionGroup>
      <AppText variant="label" tone="secondary">
        Clock
      </AppText>
      <OptionGroup label="Clock">
        <OptionRow label="24-hour" hint="14:30" selected={timeFormat === '24h'} onPress={() => setTimeFormat('24h')} />
        <OptionRow label="12-hour" hint="2:30 PM" selected={timeFormat === '12h'} last onPress={() => setTimeFormat('12h')} />
      </OptionGroup>
      <SheetButton
        label="Done"
        onPress={() => {
          s.set({ weekStart, timeFormat });
          close();
        }}
      />
    </SheetCard>
  );
}
