import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressScale } from '@/components/PressScale';
import { Radio } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { uses12h, type TimeKey } from '@/lib/dates';
import { font } from '@/theme/typography';

/** Option row inside an OptionGroup (.o): 58 px, white hairline between rows. */
export function OptionRow({
  label,
  hint,
  lead,
  trailing,
  selected,
  onPress,
  last,
  minHeight = 58,
  role = 'radio',
  danger,
}: {
  label: string;
  hint?: string;
  lead?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
  onPress: () => void;
  last?: boolean;
  minHeight?: number;
  role?: 'radio' | 'button';
  danger?: boolean;
}) {
  const { c } = useTheme();
  return (
    <PressScale
      kind="row"
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { checked: !!selected } : undefined}
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      onPress={onPress}
      style={[styles.option, { minHeight, borderBottomColor: c.card, borderBottomWidth: last ? 0 : 1 }]}
    >
      {lead}
      <View style={{ flexShrink: 1 }}>
        <AppText style={[styles.optionLabel, danger && { color: c.dangerText }]}>{label}</AppText>
        {hint ? (
          <AppText tone="secondary" style={styles.hint}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {trailing}
      {role === 'radio' ? <Radio on={!!selected} /> : null}
    </PressScale>
  );
}

/** Pill chip (.c in the date picker, .p in the time picker). */
export function PickChip({ label, on, onPress, big, full }: { label: string; on: boolean; onPress: () => void; big?: boolean; full?: boolean }) {
  const { c } = useTheme();
  return (
    <PressScale
      accessibilityRole={full ? 'radio' : 'button'}
      accessibilityState={full ? { checked: on } : { selected: on }}
      onPress={onPress}
      style={{
        minHeight: big ? 42 : 38,
        paddingHorizontal: big ? 16 : 14,
        borderRadius: big ? 14 : 12,
        backgroundColor: on ? c.accent : c.ground,
        justifyContent: 'center',
        alignItems: full ? 'center' : undefined,
      }}
    >
      <AppText style={{ ...font(700), fontSize: big ? 14.5 : 14, color: on ? c.onAccent : big ? c.text : c.textSecondary }}>{label}</AppText>
    </PressScale>
  );
}

const ROW = 44;
const GAP = 4;
// NTimeSheet: 40 px rows, 19/600 for the others.
const C_ROW = 40;
const C_GAP = 2;

/** One scrolling column of the time wheel (NTimePicker .col). The bold value follows the scroll; the choice settles when scrolling stops. */
export function WheelColumn({ values, index, onChange, label, compact }: { values: string[]; index: number; onChange: (i: number) => void; label: string; compact?: boolean }) {
  const { c } = useTheme();
  const ROW_H = compact ? C_ROW : ROW;
  const STEP = compact ? C_ROW + C_GAP : ROW + GAP;
  const GAP_ = compact ? C_GAP : GAP;
  const ref = useRef<ScrollViewInstance>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committed = useRef(index);
  const [live, setLive] = useState(index);

  const indexFor = (y: number) => Math.max(0, Math.min(values.length - 1, Math.round(y / STEP)));

  // Only scroll programmatically when the value changed from outside (not from our own scrolling).
  useEffect(() => {
    if (index !== committed.current) {
      committed.current = index;
      ref.current?.scrollTo({ y: index * STEP, animated: true });
    }
  }, [index, STEP]);

  const finish = (y: number) => {
    const i = indexFor(y);
    if (Math.abs(y - i * STEP) > 1) ref.current?.scrollTo({ y: i * STEP, animated: true });
    setLive(i);
    if (i !== committed.current) {
      committed.current = i;
      onChange(i);
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setLive(indexFor(y));
    // Web has no momentum-end event, so settle once scrolling has stopped.
    if (Platform.OS === 'web') {
      if (settle.current) clearTimeout(settle.current);
      settle.current = setTimeout(() => finish(y), 180);
    }
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: values[index] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const next = e.nativeEvent.actionName === 'increment' ? Math.min(values.length - 1, index + 1) : Math.max(0, index - 1);
        onChange(next);
      }}
      style={{ flex: 1, height: STEP * 5 - GAP_ }}
    >
      <ScrollView
        ref={ref}
        onLayout={() => ref.current?.scrollTo({ y: committed.current * STEP, animated: false })}
        showsVerticalScrollIndicator={false}
        snapToInterval={STEP}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={(e) => finish(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          if (!e.nativeEvent.velocity || Math.abs(e.nativeEvent.velocity.y) < 0.05) finish(e.nativeEvent.contentOffset.y);
        }}
        contentContainerStyle={{ paddingVertical: STEP * 2, alignItems: 'center', gap: GAP_ }}
      >
        {values.map((v, i) => {
          const on = i === live;
          return (
            <PressScale key={`${v}-${i}`} onPress={() => finish(i * STEP)} style={{ height: ROW_H, justifyContent: 'center' }} aria-hidden>
              <AppText style={on ? { ...font(800), fontSize: 28, color: c.text } : { ...font(600), fontSize: compact ? 19 : 20, color: c.line }}>{v}</AppText>
            </PressScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Grey wheel well with the white selection band (NTimePicker). */
export function WheelWell({ children, compact }: { children: ReactNode; compact?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={[styles.well, { backgroundColor: c.ground }, compact && { paddingVertical: 6 }]}>
      <View pointerEvents="none" style={[styles.band, { backgroundColor: c.card }, compact && { height: 50, marginTop: -25 }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18 },
  optionLabel: { ...font(600), fontSize: 16 },
  hint: { fontSize: 13, marginTop: 2 },
  well: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 40 },
  band: { position: 'absolute', left: 16, right: 16, top: '50%', height: 52, marginTop: -26, borderRadius: 14 },
});

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const HOURS_12 = ['12', ...Array.from({ length: 11 }, (_, i) => String(i + 1))];
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Hour and minute wheels, every minute. In 12-hour mode: 12, 1 … 11, then AM / PM.
 * `id` remounts the wheels when the value they edit changes (e.g. Starts → Ends).
 */
export function ClockWheels({ value, onChange, label = '', compact, id }: { value: TimeKey; onChange: (t: TimeKey) => void; label?: string; compact?: boolean; id?: string }) {
  const h = Number(value.slice(0, 2));
  const m = Number(value.slice(3, 5));
  const join = (hh: number, mm: number): TimeKey => `${pad2(hh)}:${pad2(mm)}`;
  const twelve = uses12h();
  return (
    <WheelWell compact={compact}>
      {twelve ? (
        <WheelColumn compact={compact} key={`h12-${id}`} label={`${label}Hour`} values={HOURS_12} index={h % 12} onChange={(i) => onChange(join(i + (h >= 12 ? 12 : 0), m))} />
      ) : (
        <WheelColumn compact={compact} key={`h24-${id}`} label={`${label}Hour`} values={HOURS_24} index={h} onChange={(i) => onChange(join(i, m))} />
      )}
      <AppText style={{ ...font(800), fontSize: 28 }}>:</AppText>
      <WheelColumn compact={compact} key={`m-${id}`} label={`${label}Minute`} values={MINUTES_60} index={m} onChange={(i) => onChange(join(h, i))} />
      {twelve ? <WheelColumn compact={compact} key={`ap-${id}`} label={`${label}AM or PM`} values={['AM', 'PM']} index={h >= 12 ? 1 : 0} onChange={(i) => onChange(join((h % 12) + i * 12, m))} /> : null}
    </WheelWell>
  );
}
