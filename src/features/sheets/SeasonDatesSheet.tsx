import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { SheetButton, SheetTitle } from '@/components/ui';
import { addDays, daysBetween, fromKey, monthGrid, monthName, shortDate, todayKey, type DateKey } from '@/lib/dates';
import { dateProblem, endFor, LENGTH_CHOICES, totalWeeks } from '@/lib/seasons';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { PickChip } from './parts';

const WEEK_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export type SeasonDates = { startDate: DateKey; endDate: DateKey };

/** The length chip that matches these dates, or null for a custom length. */
export const lengthOf = (d: SeasonDates) => LENGTH_CHOICES.find((w) => endFor(d.startDate, w) === d.endDate) ?? null;

/** CSeasonDatesSheet: Starts, Length (6, 8, 12, 16 weeks or custom), Ends. `seasonId` is the season being edited, if any. */
export function SeasonDatesSheet({ value, seasonId, onSave }: { value: SeasonDates; seasonId?: string; onSave: (d: SeasonDates) => void }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const weekStart = useSettings((s) => s.weekStart);
  const seasons = useStore((s) => s.seasons);
  const today = todayKey();
  const [v, setV] = useState<SeasonDates>(value);
  const [editing, setEditing] = useState<'startDate' | 'endDate'>('startDate');
  const shown = fromKey(v[editing]);
  const [month, setMonth] = useState({ y: shown.getFullYear(), m: shown.getMonth() });

  const weeks = lengthOf(v);
  const problem = dateProblem(seasons, v.startDate, v.endDate, today, seasonId);
  const show = (k: DateKey) => {
    const d = fromKey(k);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };
  const pick = (k: DateKey) => {
    if (editing === 'startDate') {
      // Moving the start keeps the length.
      const span = daysBetween(v.startDate, v.endDate);
      setV({ startDate: k, endDate: addDays(k, span) });
    } else setV((s) => ({ ...s, endDate: k }));
  };
  const choose = (field: 'startDate' | 'endDate') => {
    setEditing(field);
    show(v[field]);
  };
  const grid = monthGrid(month.y, month.m, weekStart);
  const letters = [...WEEK_LETTERS.slice(weekStart), ...WEEK_LETTERS.slice(0, weekStart)];
  const shiftMonth = (d: number) => setMonth(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));

  return (
    <SheetCard label="Season dates" gap={14}>
      <SheetTitle>Season dates</SheetTitle>

      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
        {(['startDate', 'endDate'] as const).map((f) => {
          const on = editing === f;
          return (
            <PressScale
              key={f}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${f === 'startDate' ? 'Starts' : 'Ends'} ${shortDate(v[f])}`}
              onPress={() => choose(f)}
              style={{ flex: 1, minHeight: 60, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: on ? c.tint : c.ground }}
            >
              <AppText style={{ ...font(600), fontSize: 12.5, color: on ? c.accentText : c.textSecondary }}>{f === 'startDate' ? 'Starts' : 'Ends'}</AppText>
              <AppText style={{ ...font(700), fontSize: 15.5, marginTop: 2, color: on ? c.accentText : c.text }}>{shortDate(v[f])}</AppText>
            </PressScale>
          );
        })}
      </View>

      <View>
        <AppText tone="secondary" style={{ ...font(600), fontSize: 12.5, marginBottom: 8 }}>
          Length
        </AppText>
        <View accessibilityRole="radiogroup" accessibilityLabel="Length" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LENGTH_CHOICES.map((w) => (
            <PickChip key={w} label={`${w} weeks`} on={weeks === w} onPress={() => setV((s) => ({ ...s, endDate: endFor(s.startDate, w) }))} />
          ))}
          <PickChip label={weeks ? 'Custom' : `Custom · ${totalWeeks(v)} wk`} on={!weeks} onPress={() => choose('endDate')} />
        </View>
      </View>

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
            const edge = cell.key === v.startDate || cell.key === v.endDate;
            const inside = cell.key > v.startDate && cell.key < v.endDate;
            return (
              <PressScale
                key={cell.key}
                accessibilityRole="button"
                accessibilityLabel={shortDate(cell.key)}
                accessibilityState={{ selected: edge }}
                onPress={() => pick(cell.key)}
                style={styles.cell}
              >
                <View style={[styles.cellInner, edge ? { backgroundColor: c.accent } : inside ? { backgroundColor: c.tint } : null]}>
                  <AppText
                    style={{
                      ...font(cell.key === today && !edge ? 800 : 600),
                      fontSize: 14.5,
                      fontVariant: ['tabular-nums'],
                      color: edge ? c.onAccent : inside || cell.key === today ? c.accentText : cell.inMonth ? c.text : c.line,
                    }}
                  >
                    {fromKey(cell.key).getDate()}
                  </AppText>
                </View>
              </PressScale>
            );
          })}
        </View>
      </View>

      {problem ? (
        <AppText accessibilityLiveRegion="polite" style={{ ...font(600), fontSize: 14, color: c.dangerText }}>
          {problem}
        </AppText>
      ) : null}
      <SheetButton
        label="Save"
        disabled={!!problem}
        onPress={() => {
          onSave(v);
          close();
        }}
      />
    </SheetCard>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  wd: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', paddingBottom: 6 },
  cell: { width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' },
  cellInner: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
