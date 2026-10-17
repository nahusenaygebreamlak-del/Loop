import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { CapLabel, SheetButton } from '@/components/ui';
import { useStore } from '@/store/store';
import type { ListColor } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';

const COLORS: { key: ListColor; name: string }[] = [
  { key: 'work', name: 'Blue' },
  { key: 'personal', name: 'Orange' },
  { key: 'learning', name: 'Green' },
  { key: 'purple', name: 'Purple' },
  { key: 'pink', name: 'Pink' },
  { key: 'slate', name: 'Slate' },
];

/** NListNew. With `listId` it edits ("Rename and colour"). */
export function ListEditSheet({ listId, onSaved }: { listId?: string; onSaved?: (id: string) => void }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const existing = useStore((s) => s.lists.find((l) => l.id === listId));
  const addList = useStore((s) => s.addList);
  const updateList = useStore((s) => s.updateList);
  const used = useStore((s) => s.lists.filter((l) => !l.deletedAt).map((l) => l.color).join(','));
  const [name, setName] = useState(existing?.name ?? '');
  // New lists start on the first colour not used yet.
  const [color, setColor] = useState<ListColor>(existing?.color ?? COLORS.find((x) => !used.split(',').includes(x.key))?.key ?? 'work');
  const can = name.trim().length > 0;

  const save = () => {
    if (!can) return;
    let id = listId;
    if (existing) updateList(existing.id, { name: name.trim(), color });
    else id = addList(name, color);
    close();
    if (id) onSaved?.(id);
  };

  return (
    <SheetCard label={existing ? 'Edit list' : 'New list'} gap={18} style={{ paddingBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="sheetTitle" accessibilityRole="header">
          {existing ? 'Edit list' : 'New list'}
        </AppText>
        <PressScale accessibilityRole="button" onPress={close} style={{ minHeight: 44, justifyContent: 'center' }}>
          <AppText tone="secondary" style={{ ...font(700), fontSize: 15 }}>
            Cancel
          </AppText>
        </PressScale>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.ground, borderWidth: 2, borderColor: c.accent }}>
        <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: listColors[color] }} />
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          onSubmitEditing={save}
          placeholder="List name"
          placeholderTextColor={c.textSecondary}
          accessibilityLabel="List name"
          style={[{ flex: 1, minWidth: 0, fontSize: 17, color: c.text, ...font(700) }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
        />
      </View>
      <View>
        <CapLabel style={{ marginBottom: 12 }}>Colour</CapLabel>
        <View accessibilityRole="radiogroup" accessibilityLabel="Colour" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {COLORS.map((x) => {
            const on = x.key === color;
            return (
              <PressScale
                key={x.key}
                accessibilityRole="radio"
                accessibilityLabel={x.name}
                accessibilityState={{ checked: on }}
                onPress={() => setColor(x.key)}
                style={{ width: 56, height: 56, borderRadius: 21, borderWidth: 3, marginHorizontal: -6, borderColor: on ? c.text : 'transparent', alignItems: 'center', justifyContent: 'center' }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: listColors[x.key], alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <Icon name="check" size={20} strokeWidth={3} color="#FFFFFF" /> : null}
                </View>
              </PressScale>
            );
          })}
        </View>
      </View>
      <SheetButton label={existing ? 'Save' : 'Create list'} disabled={!can} onPress={save} />
    </SheetCard>
  );
}
