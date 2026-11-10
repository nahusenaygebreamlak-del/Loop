import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressScale } from '@/components/PressScale';
import { daysLeft, isActive, isUpcoming, progress, TIER_LABEL, weekLine } from '@/lib/seasons';
import { monthDay, type DateKey } from '@/lib/dates';
import type { Season, Tier } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';

/** A10 Tier chip: "Core", "Secondary" or "Support" in words, never by colour alone. With onPress it opens the tier sheet. */
export function TierChip({ tier, listName, onPress }: { tier: Tier; listName?: string; onPress?: () => void }) {
  const { c } = useTheme();
  const chip = (
    <View style={{ minHeight: 26, paddingHorizontal: 10, borderRadius: 12, backgroundColor: c.tint, justifyContent: 'center' }}>
      <AppText style={{ ...font(700), fontSize: 13, color: c.accentText }}>{TIER_LABEL[tier]}</AppText>
    </View>
  );
  if (!onPress) return chip;
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={listName ? `Season tier of ${listName}: ${TIER_LABEL[tier]}` : `Season tier: ${TIER_LABEL[tier]}`}
      accessibilityHint="Changes the tier"
      onPress={onPress}
      hitSlop={9}
      style={{ minHeight: 44, justifyContent: 'center' }}
    >
      {chip}
    </PressScale>
  );
}

/** What stage the season is at, in words: "Week 3 of 12", "Starts Jan 19" or "Ended Jan 18". */
export function seasonStage(s: Season, today: DateKey): string {
  if (isActive(s, today)) return weekLine(s, today);
  if (isUpcoming(s, today)) return `Starts ${monthDay(s.startDate)}`;
  return `Ended ${monthDay(s.endedAt ? s.endedAt.slice(0, 10) : s.endDate)}`;
}

/** A7 Season line card: the week, a thin progress bar, and an optional note. */
export function SeasonLine({ season, today, note, onPress }: { season: Season; today: DateKey; note?: string | null; onPress?: () => void }) {
  const { c } = useTheme();
  const active = isActive(season, today);
  const left = daysLeft(season, today);
  const pct = active ? progress(season, today) : isUpcoming(season, today) ? 0 : 1;
  const body = (
    <View style={{ backgroundColor: c.card, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <AppText style={{ ...font(700), fontSize: 16 }}>{seasonStage(season, today)}</AppText>
        {active ? (
          <AppText tone="secondary" style={{ fontSize: 14 }}>
            {left === 1 ? 'Last day' : `${left} days left`}
          </AppText>
        ) : null}
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
        accessibilityLabel="Season progress"
        style={{ height: 4, borderRadius: 2, backgroundColor: c.line, overflow: 'hidden' }}
      >
        <View style={{ width: `${Math.round(pct * 100)}%`, height: 4, borderRadius: 2, backgroundColor: c.accent }} />
      </View>
      {note ? (
        <AppText tone="secondary" style={{ fontSize: 14, lineHeight: 20 }}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressScale kind="row" accessibilityRole="button" accessibilityHint="Opens the season" onPress={onPress}>
      {body}
    </PressScale>
  );
}
