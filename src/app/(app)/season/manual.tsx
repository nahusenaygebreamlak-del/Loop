import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { ContentIn } from '@/components/ContentIn';
import { PressScale } from '@/components/PressScale';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { Card, GroupLabel, IconButton, SheetButton, Swatch } from '@/components/ui';
import { useDesk } from '@/desktop/layout';
import { SeasonManualDesk } from '@/desktop/views/SeasonDesk';
import { TierChip } from '@/features/season/parts';
import { goBack } from '@/features/nav';
import { SeasonDatesSheet, type SeasonDates } from '@/features/sheets/SeasonDatesSheet';
import { TierSheet } from '@/features/sheets/TierSheet';
import { addDays, shortDate, todayKey } from '@/lib/dates';
import { currentSeason, dateProblem, endFor, pastSeasons, seasonName, totalWeeks } from '@/lib/seasons';
import { liveLists } from '@/lib/taskViews';
import { useStore } from '@/store/store';
import type { Season, Tier } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

export default function SeasonManualRoute() {
  const { desk } = useDesk();
  return desk ? <SeasonManualDesk /> : <SeasonManualScreen />;
}

/** The starting point for a new season: the day after the current one ends, and last season's tiers. Shared with the computer form. */
export function useNewSeasonDraft() {
  const seasons = useStore((s) => s.seasons);
  const lists = useStore((s) => s.lists);
  const addSeason = useStore((s) => s.addSeason);
  const snack = useSnackbar();
  const today = todayKey();
  const [dates, setDates] = useState<SeasonDates>(() => {
    const cur = currentSeason(seasons, today);
    const start = cur ? addDays(cur.endDate, 1) : today;
    return { startDate: start, endDate: endFor(start) };
  });
  const [name, setName] = useState('');
  // Last season's tiers are offered as the starting point (docs/13 §2.1).
  const [tiers, setTiers] = useState<Record<string, Tier>>(() => (currentSeason(seasons, today) ?? pastSeasons(seasons, today)[0])?.tiers ?? {});
  const problem = dateProblem(seasons, dates.startDate, dates.endDate, today);
  const preview: Season = { id: 'new', name: null, ...dates, endedAt: null, tiers, createdAt: '9999', updatedAt: '' };
  const save = () => {
    if (problem) return;
    const { undo } = addSeason({ name, ...dates, tiers });
    goBack();
    snack({ title: 'Season saved', actions: [{ label: 'Undo', onPress: undo }] });
  };
  return {
    lists: liveLists(lists),
    dates,
    setDates,
    name,
    setName,
    tiers,
    setTier: (listId: string, t: Tier) => setTiers((s) => ({ ...s, [listId]: t })),
    problem,
    weeks: totalWeeks(dates),
    placeholder: seasonName(preview, [...seasons, preview]),
    save,
  };
}

/** CSeasonManual: dates, an optional name and a tier for each list. */
function SeasonManualScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const d = useNewSeasonDraft();

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 130 + insets.bottom }}>
        <View style={{ paddingTop: 18, paddingHorizontal: size.sideMargin }}>
          <IconButton icon="close" label="Close" iconSize={24} style={{ marginLeft: -10 }} onPress={() => (router.canGoBack() ? router.back() : router.replace('/season'))} />
          <ContentIn>
            <AppText variant="display" accessibilityRole="header" style={{ marginTop: 16 }}>
              New season
            </AppText>
          </ContentIn>
        </View>

        <ContentIn index={1}>
          <GroupLabel style={{ paddingTop: 22 }}>When</GroupLabel>
          <Card>
            <PressScale
              kind="row"
              accessibilityRole="button"
              accessibilityLabel={`Dates, ${shortDate(d.dates.startDate)} to ${shortDate(d.dates.endDate)}, ${d.weeks} weeks`}
              onPress={() => sheets.open(() => <SeasonDatesSheet value={d.dates} onSave={d.setDates} />)}
              style={{ minHeight: 64, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: c.ground }}
            >
              <View style={{ flex: 1 }}>
                <AppText style={{ ...font(700), fontSize: 16 }}>Dates</AppText>
                <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 2 }}>
                  {`${shortDate(d.dates.startDate)} – ${shortDate(d.dates.endDate)}`}
                </AppText>
              </View>
              <AppText style={{ ...font(700), fontSize: 14.5, color: c.accentText }}>{`${d.weeks} weeks`}</AppText>
            </PressScale>
            <View style={{ minHeight: 60, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <AppText style={{ ...font(700), fontSize: 16 }}>Name</AppText>
              <TextInput
                value={d.name}
                onChangeText={d.setName}
                maxLength={40}
                placeholder={`${d.placeholder} (optional)`}
                placeholderTextColor={c.textSecondary}
                accessibilityLabel="Season name, optional"
                style={[{ flex: 1, minHeight: 44, textAlign: 'right', ...font(600), fontSize: 15.5, color: c.text }, { outlineStyle: 'none' } as object]}
              />
            </View>
          </Card>
          {d.problem ? (
            <AppText accessibilityLiveRegion="polite" style={{ ...font(600), fontSize: 14, color: c.dangerText, paddingHorizontal: size.sideMargin, paddingTop: 10 }}>
              {d.problem}
            </AppText>
          ) : null}
        </ContentIn>

        <ContentIn index={2}>
          <GroupLabel>Your lists</GroupLabel>
          <Card>
            {d.lists.map((l, i) => {
              const tier = d.tiers[l.id] ?? 'support';
              return (
                <PressScale
                  key={l.id}
                  kind="row"
                  accessibilityRole="button"
                  accessibilityLabel={`${l.name}, ${tier}`}
                  accessibilityHint="Changes the tier"
                  onPress={() => sheets.open(() => <TierSheet listName={l.name} value={tier} onPick={(t) => d.setTier(l.id, t)} />)}
                  style={{ minHeight: 60, paddingLeft: 20, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: i < d.lists.length - 1 ? 1 : 0, borderBottomColor: c.ground }}
                >
                  <Swatch color={listColors[l.color]} />
                  <AppText style={{ flex: 1, ...font(700), fontSize: 16 }}>{l.name}</AppText>
                  <TierChip tier={tier} />
                </PressScale>
              );
            })}
          </Card>
          <AppText tone="secondary" style={{ fontSize: 13.5, lineHeight: 20, paddingHorizontal: size.sideMargin, paddingTop: 10 }}>
            Core must happen this season. Secondary is nice to have. Support is upkeep. You can change these any time.
          </AppText>
        </ContentIn>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: size.sideMargin, paddingTop: 12, paddingBottom: 16 + insets.bottom, backgroundColor: c.ground }}>
        <SheetButton label="Save season" disabled={!!d.problem} onPress={d.save} />
      </View>
    </View>
  );
}
