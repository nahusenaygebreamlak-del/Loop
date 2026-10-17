import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { ConfirmDialog } from '@/components/Dialog';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet, useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { CapLabel, OptionGroup } from '@/components/ui';
import { goMain } from '@/features/nav';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { OptionRow } from './parts';

/** NTagMenu: rename the tag everywhere, or delete it (NTagDelete). */
export function TagMenuSheet({ tagId }: { tagId: string }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const sheets = useSheets();
  const snack = useSnackbar();
  const tag = useStore((s) => s.tags.find((t) => t.id === tagId));
  const tasks = useStore((s) => s.tasks);
  const renameTag = useStore((s) => s.renameTag);
  const deleteTag = useStore((s) => s.deleteTag);
  const [name, setName] = useState(tag?.name ?? '');
  if (!tag) return null;

  const tagged = tasks.filter((t) => !t.deletedAt && t.tagIds.includes(tag.id));
  const open = tagged.filter((t) => !t.doneAt).length;
  const done = tagged.length - open;
  const clean = name.replace(/^#/, '').trim();
  const can = clean.length > 0 && clean.toLowerCase() !== tag.name;

  const save = () => {
    if (!can) return;
    const id = renameTag(tag.id, clean);
    close();
    if (id !== tag.id) router.setParams({ id });
    snack({ title: `Renamed to #${useStore.getState().tags.find((t) => t.id === id)?.name ?? clean}` });
  };

  return (
    <SheetCard label="Tag options" style={{ paddingBottom: 20 }}>
      <View>
        <AppText variant="sheetTitle" accessibilityRole="header">{`#${tag.name}`}</AppText>
        <AppText tone="secondary" style={{ fontSize: 14, lineHeight: 21, marginTop: 6 }}>
          {`Used on ${open} open task${open === 1 ? '' : 's'} and ${done} done one${done === 1 ? '' : 's'}.`}
        </AppText>
      </View>
      <View>
        <CapLabel style={{ marginBottom: 8 }}>Rename</CapLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, paddingLeft: 16, paddingRight: 8, borderRadius: 16, backgroundColor: c.ground, borderWidth: 2, borderColor: c.accent }}>
          <AppText tone="secondary" style={{ ...font(800), fontSize: 18 }}>
            #
          </AppText>
          <TextInput
            value={name}
            onChangeText={(t) => setName(t.replace(/^#/, ''))}
            onSubmitEditing={save}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Tag name"
            style={[{ flex: 1, minWidth: 0, fontSize: 16, color: c.text, ...font(700) }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
          />
          <PressScale
            accessibilityRole="button"
            accessibilityState={{ disabled: !can }}
            disabled={!can}
            onPress={save}
            style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 12, backgroundColor: can ? c.accent : c.line, justifyContent: 'center' }}
          >
            <AppText style={{ ...font(800), fontSize: 14, color: c.onAccent }}>Save</AppText>
          </PressScale>
        </View>
        <AppText tone="secondary" style={{ fontSize: 13, marginTop: 8 }}>
          Renames it on every task.
        </AppText>
      </View>
      <OptionGroup>
        <OptionRow
          role="button"
          label="Delete tag"
          hint="Tasks stay, they just lose the tag"
          danger
          last
          onPress={() => {
            close();
            sheets.open(
              () => (
                <ConfirmDialog
                  title={`Delete #${tag.name}?`}
                  body={`It's removed from ${tagged.length} task${tagged.length === 1 ? '' : 's'}. The tasks themselves stay where they are.`}
                  confirmLabel="Delete tag"
                  onConfirm={() => {
                    goMain('/');
                    deleteTag(tag.id);
                    snack({ title: `Deleted #${tag.name}` });
                  }}
                />
              ),
              'dialog',
            );
          }}
        />
      </OptionGroup>
    </SheetCard>
  );
}
