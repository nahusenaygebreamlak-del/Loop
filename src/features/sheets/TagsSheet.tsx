import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { SheetButton, SheetTitle } from '@/components/ui';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';

/** NTags: create a tag, toggle existing ones, Done saves. */
export function TagsSheet({ value, onChange }: { value: string[]; onChange: (tagIds: string[]) => void }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const tags = useStore((s) => s.tags);
  const ensureTag = useStore((s) => s.ensureTag);
  const [selected, setSelected] = useState<string[]>(value);
  const [draft, setDraft] = useState('');

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const create = () => {
    const name = draft.trim().replace(/^#/, '');
    if (!name) return;
    const id = ensureTag(name);
    setSelected((s) => (s.includes(id) ? s : [...s, id]));
    setDraft('');
  };

  return (
    <SheetCard label="Tags" gap={18} style={{ paddingBottom: 28 }}>
      <SheetTitle>Tags</SheetTitle>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingLeft: 16, paddingRight: 8, borderRadius: 16, backgroundColor: c.ground }}>
        <AppText tone="secondary" style={{ ...font(800), fontSize: 18 }}>
          #
        </AppText>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={create}
          placeholder="New tag"
          placeholderTextColor={c.textSecondary}
          autoCapitalize="none"
          accessibilityLabel="New tag name"
          style={{ flex: 1, minWidth: 0, fontSize: 16, color: c.text, ...font(600), outlineStyle: 'none' } as object}
        />
        <PressScale
          accessibilityRole="button"
          accessibilityState={{ disabled: !draft.trim() }}
          disabled={!draft.trim()}
          onPress={create}
          style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.accent, justifyContent: 'center', opacity: draft.trim() ? 1 : 0.5 }}
        >
          <AppText tone="onAccent" style={{ ...font(800), fontSize: 14 }}>
            Create
          </AppText>
        </PressScale>
      </View>
      {tags.length ? (
        <View>
          <AppText variant="label" tone="secondary" style={{ marginBottom: 10 }}>
            Your tags
          </AppText>
          <View accessibilityRole="none" accessibilityLabel="Your tags" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tags.map((t) => {
              const on = selected.includes(t.id);
              return (
                <PressScale
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => toggle(t.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 42, paddingHorizontal: 16, borderRadius: 14, backgroundColor: on ? c.accent : c.ground }}
                >
                  <AppText style={{ ...font(700), fontSize: 15, color: on ? c.onAccent : c.text }}>#{t.name}</AppText>
                  {on ? <Icon name="check" size={16} strokeWidth={3} color={c.onAccent} /> : null}
                </PressScale>
              );
            })}
          </View>
        </View>
      ) : null}
      <SheetButton
        label="Done"
        onPress={() => {
          onChange(selected);
          close();
        }}
      />
    </SheetCard>
  );
}
