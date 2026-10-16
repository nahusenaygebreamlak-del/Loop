import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { monthDay, toKey } from '@/lib/dates';
import { noteDate } from '@/lib/inboxViews';
import { useToday } from '@/lib/useToday';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { goBack } from '../nav';

/** NNoteMenu. `flush` saves the editor's pending text first. */
export function NoteMenuSheet({ noteId, flush }: { noteId: string; flush: () => void }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const snack = useSnackbar();
  const { today } = useToday();
  const note = useStore((s) => s.notes.find((n) => n.id === noteId));
  const updateNote = useStore((s) => s.updateNote);
  const duplicateNote = useStore((s) => s.duplicateNote);
  const deleteNote = useStore((s) => s.deleteNote);
  const noteToTask = useStore((s) => s.noteToTask);
  if (!note) return null;

  const edited = noteDate(note, today).replace('Edited ', '').toLowerCase();
  const run = (fn: () => void) => () => {
    flush();
    close();
    fn();
  };

  return (
    <SheetCard label="Note options" gap={14} style={{ paddingBottom: 28 }}>
      <View>
        <AppText style={{ ...font(800), fontSize: 18 }}>{note.title || 'Untitled note'}</AppText>
        <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 4 }}>
          Created {monthDay(toKey(new Date(note.createdAt)))} · edited {edited}
        </AppText>
      </View>
      <View style={{ backgroundColor: c.ground, borderRadius: radius.card, overflow: 'hidden' }}>
        <Row
          icon="completed"
          label="Make a task"
          hint="Keeps the text as the task's notes"
          onPress={run(() => {
            const id = useStore.getState().notes.find((n) => n.id === noteId) ? noteToTask(noteId) : null;
            if (id) router.replace({ pathname: '/task/[id]', params: { id } });
          })}
        />
        <Row icon="pin" label={note.pinned ? 'Unpin' : 'Pin to top'} onPress={run(() => updateNote(noteId, { pinned: !note.pinned }))} />
        <Row
          icon="copy"
          label="Duplicate"
          onPress={run(() => {
            const id = duplicateNote(noteId);
            if (id) router.replace({ pathname: '/note/[id]', params: { id } });
          })}
        />
        <Row
          icon="trash"
          label="Delete"
          danger
          last
          onPress={run(() => {
            const undo = deleteNote(noteId);
            goBack();
            snack({ title: 'Note moved to Trash', sub: 'Kept for 30 days', actions: [{ label: 'Undo', onPress: undo }] });
          })}
        />
      </View>
    </SheetCard>
  );
}

function Row({ icon, label, hint, danger, last, onPress }: { icon: IconName; label: string; hint?: string; danger?: boolean; last?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale
      kind="row"
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 18, paddingVertical: hint ? 10 : 0, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.card }}
    >
      <Icon name={icon} color={danger ? c.dangerText : c.textSecondary} />
      <View>
        <AppText style={{ ...font(600), fontSize: 16, color: danger ? c.dangerText : c.text }}>{label}</AppText>
        {hint ? (
          <AppText tone="secondary" style={{ fontSize: 13, marginTop: 2 }}>
            {hint}
          </AppText>
        ) : null}
      </View>
    </PressScale>
  );
}
