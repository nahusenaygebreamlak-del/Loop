import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { ConfirmDialog } from '@/components/Dialog';
import { ContentIn } from '@/components/ContentIn';
import { EmptyState } from '@/components/EmptyState';
import { PressScale } from '@/components/PressScale';
import { MainScroll, ScreenHeader } from '@/components/rows';
import { SheetCard, useCloseSheet, useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { Card, GroupLabel, IconButton, OptionGroup, SheetButton, SheetTitle, Swatch } from '@/components/ui';
import { useDesk } from '@/desktop/layout';
import { SeasonDesk } from '@/desktop/views/SeasonDesk';
import { SeasonLine, seasonStage, TierChip } from '@/features/season/parts';
import { OptionRow } from '@/features/sheets/parts';
import { SeasonDatesSheet } from '@/features/sheets/SeasonDatesSheet';
import { TierSheet } from '@/features/sheets/TierSheet';
import { useMenu } from '@/features/useMenu';
import { currentSeason, dateRange, groupByTier, isOver, pastSeasons, seasonName, TIER_LABEL, TIERS } from '@/lib/seasons';
import { openCount, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import type { Season } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

export default function SeasonRoute() {
  const { desk } = useDesk();
  return desk ? <SeasonDesk /> : <SeasonScreen />;
}

/** Ends the season after a confirm, with Undo. Shared with the computer page. */
export function useEndSeason() {
  const sheets = useSheets();
  const snack = useSnackbar();
  const endSeason = useStore((s) => s.endSeason);
  return (season: Season) =>
    sheets.open(
      () => (
        <ConfirmDialog
          title="End this season?"
          body="Tiers will be cleared. Your lists and tasks stay as they are."
          confirmLabel="End season"
          onConfirm={() => {
            const undo = endSeason(season.id);
            snack({ title: 'Season ended', actions: [{ label: 'Undo', onPress: undo }] });
          }}
        />
      ),
      'dialog',
    );
}

/** CSeason and CSeasonEmpty. With ?id= it shows a finished season, read-only. */
function SeasonScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { c } = useTheme();
  const sheets = useSheets();
  const openMenu = useMenu();
  const { today } = useToday();
  const seasons = useStore((s) => s.seasons);
  const allLists = useStore((s) => s.lists);
  const allTasks = useStore((s) => s.tasks);
  const updateSeason = useStore((s) => s.updateSeason);
  const endIt = useEndSeason();

  const season = id ? (seasons.find((s) => s.id === id) ?? null) : currentSeason(seasons, today);
  const past = pastSeasons(seasons, today);

  if (!season) {
    return (
      <MainScroll>
        <ScreenHeader title="Season" subtitle="No season yet" onMenu={openMenu} />
        <ContentIn index={1} style={{ paddingTop: 26 }}>
          <EmptyState
            icon="flag"
            title="Pick what matters most"
            text="Choose a few lists that matter most for the next 12 weeks."
            actions={[{ label: 'Start a season', primary: true, onPress: () => router.push('/season/manual') }]}
          />
        </ContentIn>
        <PastSeasons seasons={past} all={seasons} />
      </MainScroll>
    );
  }

  const readOnly = isOver(season, today);
  const tasks = visibleTasks(allTasks, allLists);
  const groups = groupByTier(allLists, season);
  const name = seasonName(season, seasons);

  return (
    <MainScroll>
      <ScreenHeader
        title="Season"
        subtitle={`${name} · ${dateRange(season)}`}
        onMenu={openMenu}
        right={
          readOnly ? undefined : (
            <IconButton
              icon="more"
              label="Edit season"
              style={{ marginRight: -10 }}
              onPress={() =>
                sheets.open(() => (
                  <SeasonMenuSheet
                    season={season}
                    name={name}
                    onDates={() => sheets.open(() => <SeasonDatesSheet value={season} seasonId={season.id} onSave={(d) => updateSeason(season.id, d)} />)}
                    onRename={() => sheets.open(() => <SeasonNameSheet seasonId={season.id} />)}
                    onEnd={() => endIt(season)}
                  />
                ))
              }
            />
          )
        }
      />

      <ContentIn index={1} style={{ paddingTop: 22, paddingHorizontal: size.sideMargin }}>
        <SeasonLine season={season} today={today} />
      </ContentIn>

      {TIERS.map((tier, ti) => (
        <ContentIn key={tier} index={ti + 2}>
          <GroupLabel>{`${TIER_LABEL[tier]} · ${groups[tier].length}`}</GroupLabel>
          <Card>
            {groups[tier].length === 0 ? (
              <View style={{ minHeight: 56, paddingHorizontal: 20, justifyContent: 'center' }}>
                <AppText tone="secondary" style={{ fontSize: 14.5 }}>
                  {tier === 'core' ? 'No core lists yet. Tap a list’s tier to change it.' : 'None'}
                </AppText>
              </View>
            ) : null}
            {groups[tier].map((l, i) => {
              const open = openCount(tasks, l.id);
              return (
                <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 60, paddingLeft: 20, paddingRight: 14, borderBottomWidth: i < groups[tier].length - 1 ? 1 : 0, borderBottomColor: c.ground }}>
                  <PressScale
                    kind="row"
                    accessibilityRole="button"
                    accessibilityLabel={`${l.name}, ${open} open task${open === 1 ? '' : 's'}`}
                    accessibilityHint="Opens the list"
                    onPress={() => router.push({ pathname: '/list/[id]', params: { id: l.id } })}
                    style={{ flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <Swatch color={listColors[l.color]} />
                    <View style={{ flexShrink: 1 }}>
                      <AppText style={{ ...font(700), fontSize: 16 }}>{l.name}</AppText>
                      <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 2 }}>
                        {`${open} open task${open === 1 ? '' : 's'}`}
                      </AppText>
                    </View>
                  </PressScale>
                  <TierChip
                    tier={tier}
                    listName={l.name}
                    onPress={readOnly ? undefined : () => sheets.open(() => <TierSheet listName={l.name} value={tier} seasonId={season.id} listId={l.id} />)}
                  />
                </View>
              );
            })}
          </Card>
        </ContentIn>
      ))}

      {readOnly ? null : (
        <View style={{ alignItems: 'center', paddingTop: 22 }}>
          <PressScale accessibilityRole="button" onPress={() => endIt(season)} style={{ minHeight: 48, paddingHorizontal: 18, justifyContent: 'center' }}>
            <AppText style={{ ...font(700), fontSize: 15, color: c.dangerText }}>End season</AppText>
          </PressScale>
        </View>
      )}
      {id ? null : <PastSeasons seasons={past} all={seasons} />}
    </MainScroll>
  );
}

function PastSeasons({ seasons, all }: { seasons: Season[]; all: Season[] }) {
  const { c } = useTheme();
  const { today } = useToday();
  if (!seasons.length) return null;
  return (
    <>
      <GroupLabel>Past seasons</GroupLabel>
      <Card>
        {seasons.map((s, i) => (
          <PressScale
            key={s.id}
            kind="row"
            accessibilityRole="button"
            accessibilityHint="Opens it, read-only"
            onPress={() => router.push({ pathname: '/season', params: { id: s.id } })}
            style={{ minHeight: 60, paddingHorizontal: 20, justifyContent: 'center', borderBottomWidth: i < seasons.length - 1 ? 1 : 0, borderBottomColor: c.ground }}
          >
            <AppText style={{ ...font(700), fontSize: 16 }}>{seasonName(s, all)}</AppText>
            <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 2 }}>
              {`${dateRange(s)} · ${seasonStage(s, today)}`}
            </AppText>
          </PressScale>
        ))}
      </Card>
    </>
  );
}

/** ⋯ on the Season page: Change dates, Rename, End season. */
function SeasonMenuSheet({ season, name, onDates, onRename, onEnd }: { season: Season; name: string; onDates: () => void; onRename: () => void; onEnd: () => void }) {
  const close = useCloseSheet();
  const then = (fn: () => void) => () => {
    close();
    fn();
  };
  return (
    <SheetCard label="Edit season" gap={14} style={{ paddingBottom: 28 }}>
      <SheetTitle hint={dateRange(season)}>{name}</SheetTitle>
      <OptionGroup>
        <OptionRow role="button" label="Change dates" onPress={then(onDates)} />
        <OptionRow role="button" label="Rename" onPress={then(onRename)} />
        <OptionRow role="button" label="End season" danger last onPress={then(onEnd)} />
      </OptionGroup>
    </SheetCard>
  );
}

/** Rename: an empty name goes back to "Season N". */
export function SeasonNameSheet({ seasonId }: { seasonId: string }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const season = useStore((s) => s.seasons.find((x) => x.id === seasonId));
  const seasons = useStore((s) => s.seasons);
  const updateSeason = useStore((s) => s.updateSeason);
  const [text, setText] = useState(season?.name ?? '');
  if (!season) return null;
  const save = () => {
    updateSeason(seasonId, { name: text });
    close();
  };
  return (
    <SheetCard label="Rename season">
      <SheetTitle>Rename season</SheetTitle>
      <TextInput
        autoFocus
        value={text}
        onChangeText={setText}
        onSubmitEditing={save}
        maxLength={40}
        placeholder={seasonName({ ...season, name: null }, seasons)}
        placeholderTextColor={c.textSecondary}
        accessibilityLabel="Season name"
        style={[{ minHeight: 56, paddingHorizontal: 18, borderRadius: 16, backgroundColor: c.ground, ...font(700), fontSize: 17, color: c.text }, { outlineStyle: 'none' } as object]}
      />
      <SheetButton label="Save" onPress={save} />
    </SheetCard>
  );
}
