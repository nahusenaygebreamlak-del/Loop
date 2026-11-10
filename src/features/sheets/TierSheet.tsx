import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { OptionGroup, SheetTitle } from '@/components/ui';
import { TIER_HINT, TIER_LABEL, TIERS, tierOf } from '@/lib/seasons';
import { useStore } from '@/store/store';
import type { Tier } from '@/store/types';
import { OptionRow } from './parts';

/** Marks the list and confirms with Undo. Shared by the phone sheet and the computer menus. */
export function useSetTier() {
  const snack = useSnackbar();
  const setTier = useStore((s) => s.setTier);
  return (seasonId: string, listId: string, tier: Tier) => {
    const s = useStore.getState();
    const season = s.seasons.find((x) => x.id === seasonId);
    const list = s.lists.find((l) => l.id === listId);
    if (!season || !list || tierOf(season, listId) === tier) return;
    const undo = setTier(seasonId, listId, tier);
    snack({ title: `${list.name} is now ${TIER_LABEL[tier]}`, actions: [{ label: 'Undo', onPress: undo }] });
  };
}

/** CTierSheet: Core, Secondary or Support for one list. With `onPick` it only reports the choice (the new-season form). */
export function TierSheet({ listName, value, seasonId, listId, onPick }: { listName: string; value: Tier; seasonId?: string; listId?: string; onPick?: (t: Tier) => void }) {
  const close = useCloseSheet();
  const setTier = useSetTier();
  return (
    <SheetCard label="Season tier" style={{ paddingBottom: 28 }}>
      <SheetTitle>{`Season tier · ${listName}`}</SheetTitle>
      <OptionGroup label="Tier">
        {TIERS.map((t, i) => (
          <OptionRow
            key={t}
            label={TIER_LABEL[t]}
            hint={TIER_HINT[t]}
            selected={value === t}
            last={i === TIERS.length - 1}
            onPress={() => {
              close();
              if (onPick) onPick(t);
              else if (seasonId && listId) setTier(seasonId, listId, t);
            }}
          />
        ))}
      </OptionGroup>
    </SheetCard>
  );
}
