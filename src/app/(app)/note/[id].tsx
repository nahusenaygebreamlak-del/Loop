import { useLocalSearchParams } from 'expo-router';
import { useDesk } from '@/desktop/layout';
import { NotesDesk } from '@/desktop/views/NotesDesk';
import { NoteEditor } from '@/features/notes/NoteEditor';

/** NNoteEditor; on the computer a note opens in the Notes screen's editor column (WNotes). */
export default function NoteEditorRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { desk } = useDesk();
  return desk ? <NotesDesk openId={id} /> : <NoteEditor key={id} id={id} />;
}
