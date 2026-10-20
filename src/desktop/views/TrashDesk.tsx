import { EmptyPanel } from '../TaskPanel';

/** A deleted item in the panel (WTrash). */
export function TrashPanel({ entry, id, onClose }: { entry: 'task' | 'inbox' | 'note'; id: string; onClose: () => void }) {
  void entry;
  void id;
  void onClose;
  return <EmptyPanel />;
}
