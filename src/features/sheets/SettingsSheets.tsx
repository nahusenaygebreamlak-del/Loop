import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { CapLabel, OptionGroup, SheetButton, SheetTitle } from '@/components/ui';
import type { TimeKey } from '@/lib/dates';
import { useSettings, useTimeFormat } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemePreference } from '@/theme/tokens';
import { colors, radius } from '@/theme/tokens';
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
export function CheckinTimeSheet({ kind, initial, onSave }: { kind: CheckinKind; initial?: TimeKey; onSave?: (t: TimeKey) => void }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const saved = useSettings((s) => s[kind]);
  const current = initial ?? saved;
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
        {onSave ? null : (
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
        )}
        <PressScale
          accessibilityRole="button"
          onPress={() => {
            if (onSave) onSave(value);
            else set({ [kind]: value });
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

export const THEME_LABEL: Record<ThemePreference, string> = { light: 'Light', dark: 'Dark', system: 'Follow phone' };

/** NTheme: three preview tiles; the picked one is outlined with its label in blue. */
export function ThemeSheet() {
  const close = useCloseSheet();
  const { c, preference, setPreference } = useTheme();
  const options: { key: ThemePreference; label: string }[] = [
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
    { key: 'system', label: 'Follow phone' },
  ];
  const L = colors.light;
  const D = colors.dark;
  const bar = (bg: string, r: object = { borderRadius: 7 }) => <View style={[{ height: 22, backgroundColor: bg }, r]} />;
  const preview = (k: ThemePreference) => {
    if (k !== 'system') {
      const p = k === 'light' ? L : D;
      return (
        <View style={{ flex: 1, padding: 12, gap: 6, backgroundColor: p.ground }}>
          <View style={{ height: 10, width: '50%', borderRadius: 4, backgroundColor: p.text }} />
          {bar(p.card)}
          {bar(p.accent)}
          {bar(p.card)}
        </View>
      );
    }
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: 1, paddingVertical: 12, paddingLeft: 12, gap: 6, backgroundColor: L.ground }}>
          <View style={{ height: 10, width: '70%', borderRadius: 4, backgroundColor: L.text }} />
          {bar(L.card, { borderTopLeftRadius: 7, borderBottomLeftRadius: 7 })}
          {bar(L.accent, { borderTopLeftRadius: 7, borderBottomLeftRadius: 7 })}
        </View>
        <View style={{ flex: 1, paddingVertical: 12, paddingRight: 12, gap: 6, backgroundColor: D.ground }}>
          <View style={{ height: 10 }} />
          {bar(D.card, { borderTopRightRadius: 7, borderBottomRightRadius: 7 })}
          {bar(D.accent, { borderTopRightRadius: 7, borderBottomRightRadius: 7 })}
        </View>
      </View>
    );
  };
  return (
    <SheetCard label="Theme" style={{ paddingBottom: 28 }}>
      <AppText variant="sheetTitle" accessibilityRole="header">
        Theme
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel="Theme" style={{ flexDirection: 'row', gap: 10 }}>
        {options.map((o) => {
          const on = preference === o.key;
          return (
            <PressScale
              key={o.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.label}
              onPress={() => setPreference(o.key)}
              style={{ flex: 1, alignItems: 'center', gap: 10 }}
            >
              <View aria-hidden style={{ alignSelf: 'stretch', padding: 3, margin: -6, borderRadius: 22, borderWidth: 3, borderColor: on ? c.accent : 'transparent' }}>
                <View style={{ height: 120, borderRadius: 16, overflow: 'hidden', borderWidth: o.key === 'light' ? 1 : 0, borderColor: L.line }}>{preview(o.key)}</View>
              </View>
              <AppText style={{ ...font(on ? 800 : 700), fontSize: 15, marginTop: 6, color: on ? c.accentText : c.text }}>{o.label}</AppText>
            </PressScale>
          );
        })}
      </View>
      <SheetButton label="Done" onPress={close} />
    </SheetCard>
  );
}

/** NWeekTime: Sunday/Monday chips, then 24-hour / 12-hour with examples. */
export function WeekTimeSheet() {
  const close = useCloseSheet();
  const s = useSettings();
  const [weekStart, setWeekStart] = useState(s.weekStart);
  const [timeFormat, setTimeFormat] = useState(useTimeFormat());
  return (
    <SheetCard label="Week and time" style={{ paddingBottom: 28 }}>
      <AppText variant="sheetTitle" accessibilityRole="header">
        Week and time
      </AppText>
      <View>
        <CapLabel style={{ marginBottom: 10 }}>Week starts on</CapLabel>
        <View accessibilityRole="radiogroup" accessibilityLabel="Week starts on" style={{ flexDirection: 'row', gap: 8 }}>
          {(['Sunday', 'Monday'] as const).map((d, i) => (
            <View key={d} style={{ flex: 1 }}>
              <PickChip big full label={d} on={weekStart === i} onPress={() => setWeekStart(i as 0 | 1)} />
            </View>
          ))}
        </View>
      </View>
      <View>
        <CapLabel style={{ marginBottom: 10 }}>Clock</CapLabel>
        <OptionGroup label="Clock">
          <OptionRow label="24-hour" hint="10:00 – 15:30" selected={timeFormat === '24h'} onPress={() => setTimeFormat('24h')} />
          <OptionRow label="12-hour" hint="10:00 AM – 3:30 PM" selected={timeFormat === '12h'} last onPress={() => setTimeFormat('12h')} />
        </OptionGroup>
      </View>
      <SheetButton
        label="Done"
        onPress={() => {
          s.set({ weekStart, timeFormat, timeFormatChosen: true });
          close();
        }}
      />
    </SheetCard>
  );
}
