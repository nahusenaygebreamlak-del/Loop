import { usePathname } from 'expo-router';
import { EventPanel } from './EventPanel';
import { useDeskState } from './state';
import { EmptyPanel, TaskPanel } from './TaskPanel';
import { SortPanel } from './views/InboxDesk';
import { TrashPanel } from './views/TrashDesk';
import { DebriefEmptyPanel, LeftoverPanel, SuggestionPanel } from './views/DebriefDesk';

/** Whatever is selected: a task, a Google event, a deleted item, or the Inbox sorting card. */
export function DetailPanel() {
  const selected = useDeskState((s) => s.selected);
  const path = usePathname();
  const close = () => useDeskState.setState({ selected: null });
  if (!selected) return path.startsWith('/inbox') ? <SortPanel id="" /> : path.startsWith('/debrief') ? <DebriefEmptyPanel /> : <EmptyPanel />;
  switch (selected.kind) {
    case 'task':
      return <TaskPanel id={selected.id} onClose={close} />;
    case 'event':
      return <EventPanel id={selected.id} onClose={close} />;
    case 'trash':
      return <TrashPanel entry={selected.entry} id={selected.id} onClose={close} />;
    case 'sort':
      return <SortPanel id={selected.id} />;
    case 'suggestion':
      return <SuggestionPanel id={selected.id} onClose={close} />;
    case 'leftover':
      return <LeftoverPanel id={selected.id} onClose={close} />;
  }
}
