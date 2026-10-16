import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { OptionGroup, SheetTitle } from '@/components/ui';
import { reminderLabel } from '@/lib/taskViews';
import { OptionRow } from './parts';

const OPTIONS: (number | null)[] = [null, 0, 5, 15, 30, 60, 1440];

/** Reminder offset. Styled like NPriority (no dedicated design). */
export function ReminderSheet({ value, onChange }: { value: number | null; onChange: (min: number | null) => void }) {
  const close = useCloseSheet();
  return (
    <SheetCard label="Reminder" style={{ paddingBottom: 28 }}>
      <SheetTitle>Reminder</SheetTitle>
      <OptionGroup label="Reminder">
        {OPTIONS.map((o, i) => (
          <OptionRow
            key={String(o)}
            label={reminderLabel(o)}
            selected={value === o}
            last={i === OPTIONS.length - 1}
            minHeight={54}
            onPress={() => {
              onChange(o);
              close();
            }}
          />
        ))}
      </OptionGroup>
    </SheetCard>
  );
}
