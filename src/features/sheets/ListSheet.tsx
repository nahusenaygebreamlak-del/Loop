import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { OptionGroup, SheetTitle, Swatch } from '@/components/ui';
import { openCount } from '@/lib/taskViews';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { OptionRow } from './parts';

/** NMoveList. `null` = Inbox. */
export function ListSheet({ value, onChange }: { value: string | null; onChange: (listId: string | null) => void }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const lists = useStore((s) => s.lists);
  const tasks = useStore((s) => s.tasks);
  const [q, setQ] = useState('');

  const visible = lists
    .filter((l) => !l.deletedAt && !l.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((l) => l.name.toLowerCase().includes(q.trim().toLowerCase()));
  const showInbox = 'inbox'.includes(q.trim().toLowerCase());

  const pick = (id: string | null) => {
    onChange(id);
    close();
  };

  return (
    <SheetCard label="Move to list" style={{ paddingBottom: 28 }}>
      <SheetTitle>Move to list</SheetTitle>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.ground }}>
        <Icon name="search" size={20} color={c.textSecondary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Find a list"
          placeholderTextColor={c.textSecondary}
          accessibilityLabel="Find a list"
          style={{ flex: 1, minWidth: 0, fontSize: 15, color: c.text, ...font(500), outlineStyle: 'none' } as object}
        />
      </View>
      <OptionGroup label="Lists">
        {showInbox ? (
          <OptionRow label="Inbox" selected={value === null} lead={<Icon name="inbox" color={c.textSecondary} />} onPress={() => pick(null)} last={!visible.length} />
        ) : null}
        {visible.map((l, i) => (
          <OptionRow
            key={l.id}
            label={l.name}
            selected={value === l.id}
            lead={<Swatch color={listColors[l.color]} />}
            trailing={
              <AppText tone="secondary" style={{ ...font(600), fontSize: 13.5 }}>
                {openCount(tasks, l.id)}
              </AppText>
            }
            onPress={() => pick(l.id)}
            last={i === visible.length - 1}
          />
        ))}
      </OptionGroup>
    </SheetCard>
  );
}
