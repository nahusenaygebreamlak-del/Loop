import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useCloseSheet, useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { goMain } from '@/features/nav';
import { NoteEditor } from '@/features/notes/NoteEditor';
import { notePreview, notesList } from '@/lib/inboxViews';
import { ago } from '@/sync/status';
import { useStore } from '@/store/store';
import type { Note } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { MenuItem, MenuSeparator } from '../Menu';
import { selectTask } from '../state';
import { DeskEmpty, DeskHeader, GroupLab, KeyButton, SoftButton } from '../ui';
import { useViewKeys } from '../useDeskKeys';

const noteText = (n: Note) => [n.title, ...n.body.map((b) => (b.type === 'checklist' ? `${b.done ? '☑' : '☐'} ${b.text}` : b.type === 'bullet' ? `• ${b.text}` : b.text))].filter(Boolean).join('\n');

/** WNotes: the notes list (Pinned / Others) with the editor in the right column. */
export function NotesDesk({ openId }: { openId?: string }) {
  const { c } = useTheme();
  const sheets = useSheets();
  const notes = notesList(useStore((s) => s.notes));
  const current = notes.find((n) => n.id === openId) ?? notes[0];
  const pinned = notes.filter((n) => n.pinned);
  const others = notes.filter((n) => !n.pinned);
  const newNote = () => router.replace({ pathname: '/note/[id]', params: { id: useStore.getState().addNote() } });
  // On Notes, N starts a new note.
  useViewKeys((k) => (k === 'n' ? (newNote(), true) : false));

  if (!notes.length) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.ground }} contentContainerStyle={{ paddingTop: 30, paddingHorizontal: 36, paddingBottom: 40 }}>
        <DeskHeader pre="Things to keep, not to do" title="Notes" actions={<KeyButton label="New note" k="N" onPress={newNote} />} />
        <DeskEmpty icon="note" title="No notes yet" text={'Notes are for things you want to keep but don\'t need to do: ideas, lists, details. When you sort your Inbox, "Keep as note" puts things here.'}>
          <SoftButton onCard label="Write a note" onPress={newNote} />
        </DeskEmpty>
      </ScrollView>
    );
  }

  const card = (n: Note) => {
    const on = n.id === current?.id;
    return (
      <Pressable
        key={n.id}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        onPress={() => router.replace({ pathname: '/note/[id]', params: { id: n.id } })}
        style={{ backgroundColor: c.card, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 2, borderColor: on ? c.accent : 'transparent', margin: -2 }}
      >
        <AppText numberOfLines={1} style={{ ...font(700), fontSize: 15 }}>
          {n.title || 'Untitled note'}
        </AppText>
        {notePreview(n) ? (
          <AppText numberOfLines={2} tone="secondary" style={{ fontSize: 13, lineHeight: 19, marginTop: 4 }}>
            {notePreview(n)}
          </AppText>
        ) : null}
        <AppText tone="secondary" style={{ fontSize: 12, marginTop: 8 }}>{`Edited ${ago(n.updatedAt)}`}</AppText>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.ground }}>
      <ScrollView style={{ width: 420, flexGrow: 0 }} contentContainerStyle={{ paddingTop: 30, paddingLeft: 36, paddingRight: 20, paddingBottom: 40 }}>
        <DeskHeader pre={`${notes.length} note${notes.length === 1 ? '' : 's'} · not tasks`} title="Notes" actions={<KeyButton label="New note" k="N" onPress={newNote} />} />
        {pinned.length ? (
          <>
            <GroupLab first>Pinned</GroupLab>
            <View style={{ gap: 8 }}>{pinned.map(card)}</View>
          </>
        ) : null}
        {others.length ? (
          <>
            <GroupLab first={!pinned.length}>{pinned.length ? 'Others' : 'All notes'}</GroupLab>
            <View style={{ gap: 8 }}>{others.map(card)}</View>
          </>
        ) : null}
      </ScrollView>
      <View style={{ flex: 1, marginTop: 16, marginRight: 16, marginBottom: 16, backgroundColor: c.card, borderRadius: 24, paddingTop: 22, paddingHorizontal: 36, paddingBottom: 22 }}>
        {current ? (
          <NoteEditor
            key={current.id}
            id={current.id}
            desk
            deskActions={{
              onTurnIntoTask: (flush) => {
                flush();
                const id = useStore.getState().noteToTask(current.id);
                if (id) {
                  goMain('/');
                  selectTask(id);
                }
              },
              onMenu: (x, y, flush) => sheets.open(() => <NoteMenu note={current} flush={flush} />, 'menu', { x, y, alignRight: true }),
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

/** WNoteMenu: Unpin, Turn into task, Send back to Inbox, Duplicate, Download as text, Delete. */
function NoteMenu({ note, flush }: { note: Note; flush: () => void }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const snack = useSnackbar();
  const s = useStore.getState();
  const run = (fn: () => void) => () => {
    flush();
    close();
    fn();
  };
  return (
    <View accessibilityRole="menu" accessibilityLabel="Note options" style={{ width: 270, backgroundColor: c.card, borderWidth: 1, borderColor: c.desk.border, borderRadius: 16, padding: 6 }}>
      <MenuItem icon="pin" label={note.pinned ? 'Unpin' : 'Pin to top'} onPress={run(() => s.updateNote(note.id, { pinned: !note.pinned }))} />
      <MenuItem
        icon="completed"
        label="Turn into task"
        keys={['Ctrl', 'Enter']}
        onPress={run(() => {
          const id = useStore.getState().noteToTask(note.id);
          if (id) {
            goMain('/');
            selectTask(id);
          }
        })}
      />
      <MenuItem
        icon="inboxTray"
        label="Send back to Inbox"
        onPress={run(() => {
          const n = useStore.getState().notes.find((x) => x.id === note.id);
          if (!n) return;
          const inboxId = useStore.getState().addInboxItem(noteText(n).replace(/\n/g, ' · '));
          const undo = useStore.getState().deleteNote(note.id);
          router.replace('/notes');
          snack({
            title: 'Back in Inbox',
            actions: [
              {
                label: 'Undo',
                onPress: () => {
                  useStore.getState().removeInboxItem(inboxId);
                  undo?.();
                },
              },
            ],
          });
        })}
      />
      <MenuItem
        icon="copy"
        label="Duplicate"
        onPress={run(() => {
          const id = useStore.getState().duplicateNote(note.id);
          if (id) router.replace({ pathname: '/note/[id]', params: { id } });
        })}
      />
      <MenuItem
        icon="arrowRight"
        label="Download as text"
        onPress={run(() => {
          if (Platform.OS !== 'web') return;
          const n = useStore.getState().notes.find((x) => x.id === note.id);
          if (!n) return;
          const url = URL.createObjectURL(new Blob([noteText(n)], { type: 'text/plain' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = `${(n.title || 'Note').replace(/[^\w\- ]+/g, '').trim() || 'Note'}.txt`;
          a.click();
          URL.revokeObjectURL(url);
        })}
      />
      <MenuSeparator />
      <MenuItem
        icon="trash"
        label="Delete note"
        danger
        keys={['Del']}
        onPress={run(() => {
          const undo = useStore.getState().deleteNote(note.id);
          router.replace('/notes');
          snack({ title: 'Note moved to Trash', sub: 'Kept for 30 days', actions: [{ label: 'Undo', onPress: () => undo?.() }] });
        })}
      />
    </View>
  );
}
