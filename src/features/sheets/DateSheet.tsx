import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet, useSheets } from '@/components/Sheet';
import { SheetButton } from '@/components/ui';
import { Kbd } from '@/desktop/Kbd';
import { useDesk } from '@/desktop/layout';
import { parseQuickAdd } from '@/lib/parse';
import { addDays, formatTime, fromKey, monthGrid, monthName, nextMonday, shortDate, timeRange, todayKey, type DateKey, type TimeKey } from '@/lib/dates';
import { shortRuleLabel } from '@/lib/repeat';
import { reminderLabel } from '@/lib/taskViews';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { PickChip } from './parts';
import { ReminderSheet } from './ReminderSheet';
import { RepeatSheet } from './RepeatSheet';
import { TimeSheet } from './TimeSheet';

export type DateValue = {
  dueDate: DateKey | null;
  startTime: TimeKey | null;
  endTime: TimeKey | null;
  reminderMinutes: number | null;
  repeatRule: string | null;
};

const WEEK_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** NDatePicker: quick chips, month calendar, Time, Reminder, Repeat. Done saves. */
export function DateSheet({ value, onChange, title }: { value: DateValue; onChange: (v: DateValue) => void; title?: string }) {
  const weekStart = useSettings((s) => s.weekStart);
  const { c } = useTheme();
  const close = useCloseSheet();
  const sheets = useSheets();
  const today = todayKey();
  const [v, setV] = useState<DateValue>(value);
  const shownStart = fromKey(v.dueDate ?? today);
  const [month, setMonth] = useState({ y: shownStart.getFullYear(), m: shownStart.getMonth() });

  const tomorrow = addDays(today, 1);
  const suggested = v.dueDate && v.dueDate !== today && v.dueDate !== tomorrow ? v.dueDate : nextMonday(today);
  const setDate = (d: DateKey | null) => {
    setV((s) => (d ? { ...s, dueDate: d } : { ...s, dueDate: null, startTime: null, endTime: null, repeatRule: null }));
    if (d) {
      const k = fromKey(d);
      setMonth({ y: k.getFullYear(), m: k.getMonth() });
    }
  };

  const grid = monthGrid(month.y, month.m, weekStart);
  const letters = [...WEEK_LETTERS.slice(weekStart), ...WEEK_LETTERS.slice(0, weekStart)];
  const shiftMonth = (d: number) => setMonth(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));

  // Computer (WDatePop): type a date like "next fri 9am"; Enter applies it.
  const { desk } = useDesk();
  const [typed, setTyped] = useState('');
  const guess = typed.trim() ? parseQuickAdd(typed) : null;
  const guessDate = guess ? (guess.date ?? (guess.startTime ? (v.dueDate ?? today) : null)) : null;
  const applyTyped = () => {
    if (!guess || !guessDate) return false;
    const next = { ...v, dueDate: guessDate, startTime: guess.startTime ?? v.startTime, endTime: guess.startTime ? guess.endTime : v.endTime };
    setV(next);
    setDate(guessDate);
    return next;
  };
  const done = () => {
    onChange(v);
    close();
  };

  return (
    <SheetCard label="Date and reminder" gap={14}>
      {desk ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.ground }}>
          <Icon name="calendar" size={16} color={c.textSecondary} />
          <TextInput
            autoFocus
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={() => {
              const next = applyTyped();
              if (next) {
                onChange(next);
                close();
              } else done();
            }}
            placeholder="Type a date, like next fri 9am"
            placeholderTextColor={c.textSecondary}
            accessibilityLabel="Type a date"
            style={[{ flex: 1, ...font(700), fontSize: 14.5, color: c.text }, { outlineStyle: 'none' } as object]}
          />
          {guessDate ? <AppText style={{ ...font(700), fontSize: 13, color: c.accentText }}>{`${shortDate(guessDate)}${guess?.startTime ? ` · ${formatTime(guess.startTime)}` : ''}`}</AppText> : null}
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 24 }}>
        <PickChip label="Today" on={v.dueDate === today} onPress={() => setDate(today)} />
        <PickChip label="Tomorrow" on={v.dueDate === tomorrow} onPress={() => setDate(tomorrow)} />
        <PickChip label={shortDate(suggested)} on={v.dueDate === suggested} onPress={() => setDate(suggested)} />
        <PickChip label="No date" on={v.dueDate === null} onPress={() => setDate(null)} />
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText style={{ ...font(800), fontSize: 17 }} accessibilityRole="header">
          {monthName(month.m)} {month.y}
        </AppText>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {(['back', 'forward'] as const).map((dir) => (
            <PressScale
              key={dir}
              accessibilityRole="button"
              accessibilityLabel={dir === 'back' ? 'Previous month' : 'Next month'}
              onPress={() => shiftMonth(dir === 'back' ? -1 : 1)}
              hitSlop={2}
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name={dir} size={20} color={c.text} />
            </PressScale>
          ))}
        </View>
      </View>

      <View>
        <View style={styles.grid}>
          {letters.map((l, i) => (
            <AppText key={i} tone="secondary" style={styles.wd}>
              {l}
            </AppText>
          ))}
        </View>
        <View style={styles.grid}>
          {grid.map((cell) => {
            const sel = cell.key === v.dueDate;
            const isToday = cell.key === today;
            const day = fromKey(cell.key).getDate();
            return (
              <PressScale
                key={cell.key}
                accessibilityRole="button"
                accessibilityLabel={shortDate(cell.key)}
                accessibilityState={{ selected: sel }}
                onPress={() => setDate(cell.key)}
                style={styles.cell}
              >
                <View style={[styles.cellInner, sel && { backgroundColor: c.accent }]}>
                  <AppText
                    style={{
                      ...font(isToday && !sel ? 800 : 600),
                      fontSize: 14.5,
                      fontVariant: ['tabular-nums'],
                      color: sel ? c.onAccent : isToday ? c.accentText : cell.inMonth ? c.text : c.line,
                    }}
                  >
                    {day}
                  </AppText>
                </View>
              </PressScale>
            );
          })}
        </View>
      </View>

      <View>
        <Row
          icon="clock"
          label="Time"
          value={v.startTime ? timeRange(v.startTime, v.endTime) : 'None'}
          muted={!v.startTime}
          onPress={() =>
            sheets.open(() => (
              <TimeSheet
                start={v.startTime}
                end={v.endTime}
                date={v.dueDate ?? today}
                onChange={(s, e) => setV((cur) => ({ ...cur, startTime: s, endTime: e, dueDate: s && !cur.dueDate ? today : cur.dueDate }))}
              />
            ))
          }
        />
        <Row
          icon="bell"
          label="Reminder"
          value={reminderLabel(v.reminderMinutes)}
          muted={v.reminderMinutes == null}
          onPress={() => sheets.open(() => <ReminderSheet title={title} date={v.dueDate} time={v.startTime} value={v.reminderMinutes} onChange={(r) => setV((cur) => ({ ...cur, reminderMinutes: r }))} />)}
        />
        <Row
          icon="repeat"
          label="Repeat"
          value={shortRuleLabel(v.repeatRule)}
          muted={!v.repeatRule}
          onPress={() =>
            sheets.open(() => (
              <RepeatSheet
                value={v.repeatRule}
                start={v.dueDate ?? today}
                onChange={(r) => setV((cur) => ({ ...cur, repeatRule: r, dueDate: r && !cur.dueDate ? today : cur.dueDate }))}
              />
            ))
          }
        />
      </View>

      {desk ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText tone="secondary" style={{ fontSize: 12.5 }}>
            Type a date, or pick one above
          </AppText>
          <PressScale accessibilityRole="button" onPress={done} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.accent }}>
            <AppText style={{ ...font(800), fontSize: 14.5, color: c.onAccent }}>Done</AppText>
            <Kbd k="Enter" onAccent />
          </PressScale>
        </View>
      ) : (
        <SheetButton label="Done" onPress={done} />
      )}
    </SheetCard>
  );
}

function Row({ icon, label, value, muted, onPress }: { icon: IconName; label: string; value: string; muted?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale
      kind="row"
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 54, borderTopWidth: 1, borderTopColor: c.ground }}
    >
      <Icon name={icon} color={c.text} />
      <AppText style={{ ...font(600), fontSize: 15.5 }}>{label}</AppText>
      <AppText style={{ marginLeft: 'auto', ...font(700), fontSize: 15, color: muted ? c.textSecondary : c.accentText }}>{value}</AppText>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  wd: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', paddingBottom: 6 },
  cell: { width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' },
  cellInner: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
