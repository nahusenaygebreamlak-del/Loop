import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { OptionGroup } from '@/components/ui';
import { useTaskActions } from '@/features/useTaskActions';
import { todayKey } from '@/lib/dates';
import { markCarriedShown } from '@/store/local';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { OptionRow } from './parts';

/** NCarriedOver: a task has been moved 3 times. Where should it live? */
export function CarriedOverSheet({ taskId }: { taskId: string }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const snack = useSnackbar();
  const actions = useTaskActions();
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId));
  if (!task) return null;
  const times = Math.max(3, task.carriedOverCount);

  const done = (fn: () => void) => {
    markCarriedShown(taskId);
    close();
    fn();
  };

  return (
    <SheetCard label={`Moved ${times} times`} style={{ paddingBottom: 24 }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <View aria-hidden style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: c.warnTint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="carried" size={24} color={c.warn} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 21, lineHeight: 27 }}>
            {`"${task.title}" has moved ${times} times`}
          </AppText>
          <AppText tone="secondary" style={{ fontSize: 14, lineHeight: 21, marginTop: 6 }}>
            {"No judgement. Maybe it's not a today thing. Where should it live?"}
          </AppText>
        </View>
      </View>
      <OptionGroup>
        <OptionRow
          role="button"
          label="Back to the Inbox"
          hint="Decide later when you sort"
          onPress={() =>
            done(() => {
              const undo = useStore.getState().taskBackToInbox(taskId);
              snack({ title: 'Moved to the Inbox', sub: `From "${task.title}"`, actions: [{ label: 'Undo', onPress: undo }] });
            })
          }
        />
        <OptionRow role="button" label="Give it a real date" hint="Pick a day you'll actually have time" onPress={() => done(() => actions.pickDate(taskId))} />
        <OptionRow
          role="button"
          label="Keep it on today"
          hint="Today's the day"
          onPress={() =>
            done(() => {
              const today = todayKey();
              const t = useStore.getState().tasks.find((x) => x.id === taskId);
              if (t && t.dueDate !== today) useStore.getState().updateTask(taskId, { dueDate: today, carriedAt: today, carriedOverCount: t.carriedOverCount + 1 });
            })
          }
        />
        <OptionRow role="button" label="Let it go (delete)" danger last onPress={() => done(() => actions.remove(taskId))} />
      </OptionGroup>
    </SheetCard>
  );
}
