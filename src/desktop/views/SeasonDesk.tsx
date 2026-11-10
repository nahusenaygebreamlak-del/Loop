import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, TextInput, View, type ViewInstance } from 'react-native';
import { AppText } from '@/components/AppText';
import { PressScale } from '@/components/PressScale';
import { useCloseSheet, useSheets } from '@/components/Sheet';
import { SeasonNameSheet, useEndSeason } from '@/app/(app)/season/index';
import { useNewSeasonDraft } from '@/app/(app)/season/manual';
import { SeasonLine, seasonStage } from '@/features/season/parts';
import { lengthOf, SeasonDatesSheet } from '@/features/sheets/SeasonDatesSheet';
import { useSetTier } from '@/features/sheets/TierSheet';
import { shortDate } from '@/lib/dates';
import { currentSeason, dateRange, endFor, groupByTier, isOver, LENGTH_CHOICES, pastSeasons, seasonName, TIER_HINT, TIER_LABEL, TIERS, tierOf } from '@/lib/seasons';
import { openCount, visibleTasks } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import type { List, Season, Tier } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { useContextMenu } from '../dom';
import { MenuCard, MenuItem } from '../Menu';
import { DeskCard, DeskEmpty, DeskHeader, DeskPage, GroupLab, KeyButton, SoftButton } from '../ui';

/** Season tier ›: Core, Secondary, Support, the current one ticked. Opens from a list's right-click or its tier chip. */
export function TierMenu({ seasonId, listId }: { seasonId: string; listId: string }) {
  const close = useCloseSheet();
  const setTier = useSetTier();
  const season = useStore((s) => s.seasons.find((x) => x.id === seasonId));
  const list = useStore((s) => s.lists.find((l) => l.id === listId));
  if (!season || !list) return null;
  const now = tierOf(season, listId);
  return (
    <MenuCard label={`Season tier of ${list.name}`} width={250}>
      <AppText tone="secondary" style={{ ...font(700), fontSize: 12.5, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 }}>
        Season tier
      </AppText>
      {TIERS.map((t) => (
        <MenuItem
          key={t}
          label={TIER_LABEL[t]}
          value={t === now ? '✓' : undefined}
          onPress={() => {
            close();
            setTier(seasonId, listId, t);
          }}
        />
      ))}
    </MenuCard>
  );
}

/** WCSeason and WCSeasonEmpty. With ?id= it shows a finished season, read-only. */
export function SeasonDesk() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { c } = useTheme();
  const sheets = useSheets();
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
      <DeskPage>
        <DeskHeader pre="No season yet" title="Season" />
        <DeskEmpty icon="flag" title="Pick what matters most" text="Choose a few lists that matter most for the next 12 weeks. Everything else stays as it is.">
          <KeyButton label="Start a season" icon={null} onPress={() => router.push('/season/manual')} />
        </DeskEmpty>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 20 }}>
          {TIERS.map((t) => (
            <View key={t} style={{ flex: 1, minWidth: 200, backgroundColor: c.card, borderRadius: 18, padding: 18, gap: 4 }}>
              <AppText style={{ ...font(800), fontSize: 15 }}>{TIER_LABEL[t]}</AppText>
              <AppText tone="secondary" style={{ fontSize: 13.5, lineHeight: 20 }}>
                {TIER_HINT[t]}
              </AppText>
            </View>
          ))}
        </View>
        <PastSeasons seasons={past} all={seasons} />
      </DeskPage>
    );
  }

  const readOnly = isOver(season, today);
  const tasks = visibleTasks(allTasks, allLists);
  const groups = groupByTier(allLists, season);
  const name = seasonName(season, seasons);

  return (
    <DeskPage>
      <DeskHeader
        pre={`${name} · ${dateRange(season)}`}
        title="Season"
        actions={
          readOnly ? (
            <SoftButton label="Back to this season" onPress={() => router.replace('/season')} />
          ) : (
            <>
              <SoftButton label="Change dates…" onPress={() => sheets.open(() => <SeasonDatesSheet value={season} seasonId={season.id} onSave={(d) => updateSeason(season.id, d)} />, 'dialog')} />
              <SoftButton label="Rename" onPress={() => sheets.open(() => <SeasonNameSheet seasonId={season.id} />, 'dialog')} />
            </>
          )
        }
      />
      <View style={{ marginTop: 22, maxWidth: 1060 }}>
        <SeasonLine season={season} today={today} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 6, maxWidth: 1060 }}>
        {TIERS.map((tier) => (
          <View key={tier} style={{ flex: 1, minWidth: 230 }}>
            <GroupLab>{`${TIER_LABEL[tier]} · ${groups[tier].length}`}</GroupLab>
            <View style={{ gap: 8 }}>
              {groups[tier].map((l) => (
                <ListCard key={l.id} list={l} tier={tier} season={season} open={openCount(tasks, l.id)} readOnly={readOnly} />
              ))}
              {groups[tier].length === 0 ? (
                <View style={{ minHeight: 64, borderRadius: 16, backgroundColor: c.card, paddingHorizontal: 16, justifyContent: 'center', opacity: 0.7 }}>
                  <AppText tone="secondary" style={{ fontSize: 13.5, lineHeight: 19 }}>
                    {tier === 'core' ? 'No core lists yet' : 'None'}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {readOnly ? null : (
        <>
          <AppText tone="secondary" style={{ fontSize: 13, marginTop: 16 }}>
            Click a list’s tier to change it, or right-click the list here or in the sidebar.
          </AppText>
          <View style={{ flexDirection: 'row', marginTop: 22 }}>
            <SoftButton label="End season…" tone="danger" onPress={() => endIt(season)} />
          </View>
        </>
      )}
      {id ? null : <PastSeasons seasons={past} all={seasons} />}
    </DeskPage>
  );
}

function ListCard({ list, tier, season, open, readOnly }: { list: List; tier: Tier; season: Season; open: number; readOnly: boolean }) {
  const { c } = useTheme();
  const sheets = useSheets();
  const menu = (x: number, y: number) => !readOnly && sheets.open(() => <TierMenu seasonId={season.id} listId={list.id} />, 'menu', { x, y });
  const ref = useContextMenu<ViewInstance>(menu);
  return (
    <View ref={ref} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64, borderRadius: 16, backgroundColor: c.card, paddingLeft: 16, paddingRight: 10 }}>
      <PressScale
        kind="row"
        accessibilityRole="button"
        accessibilityLabel={`${list.name}, ${open} open task${open === 1 ? '' : 's'}`}
        accessibilityHint="Opens the list"
        onPress={() => router.push({ pathname: '/list/[id]', params: { id: list.id } })}
        style={{ flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: listColors[list.color] }} />
        <View style={{ flexShrink: 1 }}>
          <AppText numberOfLines={1} style={{ ...font(700), fontSize: 15 }}>
            {list.name}
          </AppText>
          <AppText tone="secondary" style={{ fontSize: 13, marginTop: 1 }}>{`${open} open`}</AppText>
        </View>
      </PressScale>
      {readOnly ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Season tier of ${list.name}: ${TIER_LABEL[tier]}`}
          accessibilityHint="Changes the tier"
          onPress={(e) => {
            const n = e.nativeEvent as unknown as { pageX: number; pageY: number };
            menu(n.pageX - 200, n.pageY + 14);
          }}
          style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 10, borderRadius: 12, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText style={{ ...font(700), fontSize: 13, color: c.accentText }}>Move ›</AppText>
        </Pressable>
      )}
    </View>
  );
}

function PastSeasons({ seasons, all }: { seasons: Season[]; all: Season[] }) {
  const { c } = useTheme();
  const { today } = useToday();
  if (!seasons.length) return null;
  return (
    <View style={{ maxWidth: 1060 }}>
      <GroupLab>Past seasons</GroupLab>
      <DeskCard>
        {seasons.map((s, i) => (
          <PressScale
            key={s.id}
            kind="row"
            accessibilityRole="button"
            accessibilityHint="Opens it, read-only"
            onPress={() => router.push({ pathname: '/season', params: { id: s.id } })}
            style={{ minHeight: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: i < seasons.length - 1 ? 1 : 0, borderBottomColor: c.ground }}
          >
            <AppText style={{ flex: 1, ...font(700), fontSize: 15 }}>{seasonName(s, all)}</AppText>
            <AppText tone="secondary" style={{ fontSize: 13.5 }}>{`${dateRange(s)} · ${seasonStage(s, today)}`}</AppText>
          </PressScale>
        ))}
      </DeskCard>
    </View>
  );
}

/** WCSeasonManual: dates with a length control, an optional name and a tier control per list. */
export function SeasonManualDesk() {
  const { c } = useTheme();
  const sheets = useSheets();
  const d = useNewSeasonDraft();
  const weeks = lengthOf(d.dates);
  const counts = TIERS.map((t) => `${d.lists.filter((l) => (d.tiers[l.id] ?? 'support') === t).length} ${TIER_LABEL[t].toLowerCase()}`).join(' · ');

  return (
    <DeskPage>
      <DeskHeader
        pre="Dates, a name if you like, and a tier for each list"
        title="New season"
        actions={
          <>
            <SoftButton label="Cancel" k="Esc" onPress={() => (router.canGoBack() ? router.back() : router.replace('/season'))} />
            <KeyButton label="Save season" icon={null} onPress={d.save} />
          </>
        }
      />
      <View style={{ maxWidth: 760 }}>
        <GroupLab first>When</GroupLab>
        <DeskCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, minHeight: 64, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.ground }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Dates, ${shortDate(d.dates.startDate)} to ${shortDate(d.dates.endDate)}`}
              accessibilityHint="Opens the calendar"
              onPress={() => sheets.open(() => <SeasonDatesSheet value={d.dates} onSave={d.setDates} />, 'dialog')}
              style={{ flex: 1, minWidth: 220, minHeight: 44, justifyContent: 'center' }}
            >
              <AppText style={{ ...font(700), fontSize: 15.5 }}>{`${shortDate(d.dates.startDate)} – ${shortDate(d.dates.endDate)}`}</AppText>
              <AppText style={{ ...font(600), fontSize: 13, marginTop: 2, color: c.accentText }}>Change dates…</AppText>
            </Pressable>
            <View accessibilityRole="radiogroup" accessibilityLabel="Length" style={{ flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: c.cal.segBg }}>
              {LENGTH_CHOICES.map((w) => {
                const on = weeks === w;
                return (
                  <Pressable
                    key={w}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${w} weeks`}
                    onPress={() => d.setDates({ startDate: d.dates.startDate, endDate: endFor(d.dates.startDate, w) })}
                    style={{ minHeight: 36, minWidth: 44, paddingHorizontal: 12, borderRadius: 9, backgroundColor: on ? c.card : 'transparent', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <AppText style={{ ...font(on ? 700 : 600), fontSize: 13.5, color: on ? c.text : c.textSecondary }}>{`${w} wk`}</AppText>
                  </Pressable>
                );
              })}
              {weeks ? null : (
                <View style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 9, backgroundColor: c.card, justifyContent: 'center' }}>
                  <AppText style={{ ...font(700), fontSize: 13.5 }}>{`Custom · ${d.weeks} wk`}</AppText>
                </View>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 20 }}>
            <AppText style={{ ...font(700), fontSize: 15.5 }}>Name</AppText>
            <TextInput
              value={d.name}
              onChangeText={d.setName}
              onSubmitEditing={d.save}
              maxLength={40}
              placeholder={`${d.placeholder} (optional)`}
              placeholderTextColor={c.textSecondary}
              accessibilityLabel="Season name, optional"
              style={[{ flex: 1, minHeight: 44, textAlign: 'right', ...font(600), fontSize: 15, color: c.text }, { outlineStyle: 'none' } as object]}
            />
          </View>
        </DeskCard>
        {d.problem ? (
          <AppText accessibilityLiveRegion="polite" style={{ ...font(600), fontSize: 14, color: c.dangerText, paddingTop: 10 }}>
            {d.problem}
          </AppText>
        ) : null}

        <GroupLab>Your lists</GroupLab>
        <DeskCard>
          {d.lists.map((l, i) => {
            const tier = d.tiers[l.id] ?? 'support';
            return (
              <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingLeft: 20, paddingRight: 14, borderBottomWidth: i < d.lists.length - 1 ? 1 : 0, borderBottomColor: c.ground }}>
                <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: listColors[l.color] }} />
                <AppText numberOfLines={1} style={{ flex: 1, ...font(700), fontSize: 15 }}>
                  {l.name}
                </AppText>
                <View accessibilityRole="radiogroup" accessibilityLabel={`Tier of ${l.name}`} style={{ flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: c.cal.segBg }}>
                  {TIERS.map((t) => {
                    const on = tier === t;
                    return (
                      <Pressable
                        key={t}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        onPress={() => d.setTier(l.id, t)}
                        style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 9, backgroundColor: on ? c.card : 'transparent', justifyContent: 'center' }}
                      >
                        <AppText style={{ ...font(on ? 700 : 600), fontSize: 13.5, color: on ? c.text : c.textSecondary }}>{TIER_LABEL[t]}</AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </DeskCard>
        <AppText tone="secondary" style={{ fontSize: 13.5, lineHeight: 20, paddingTop: 12 }}>
          {`${counts}. Core must happen this season, Secondary is nice to have, Support is upkeep. You can change these any time.`}
        </AppText>
      </View>
    </DeskPage>
  );
}
