import { AppText } from '@/components/AppText';
import { SheetCard, useCloseSheet } from '@/components/Sheet';
import { OptionGroup, SheetTitle } from '@/components/ui';
import { addDays, formatTime, minutesToTime, timeToMinutes, weekdayShort, type DateKey, type TimeKey } from '@/lib/dates';
import { reminderLabel } from '@/lib/taskViews';
import { OptionRow } from './parts';

const OPTIONS: (number | null)[] = [null, 0, 5, 15, 30, 60, 1440];
const UNTIMED = '09:00';

/** NReminder: radio list with the resulting clock time under the key options. */
export function ReminderSheet({
  value,
  onChange,
  title,
  date,
  time,
}: {
  value: number | null;
  onChange: (min: number | null) => void;
  title?: string;
  date?: DateKey | null;
  time?: TimeKey | null;
}) {
  const close = useCloseSheet();
  const at = time ?? UNTIMED;
  const clock = (o: number) => {
    if (o >= 1440 && date) return `${weekdayShort(addDays(date, -Math.round(o / 1440)))} at ${formatTime(at)}`;
    return formatTime(minutesToTime(Math.max(0, timeToMinutes(at) - o)));
  };
  const hintFor = (o: number | null) => (o == null ? undefined : o === 0 || o >= 1440 || o === value ? clock(o) : undefined);
  const lede = title ? (time ? `A notification before "${title}" starts at ${formatTime(time)}.` : `A notification for "${title}" on the day.`) : undefined;

  return (
    <SheetCard label="Reminder" style={{ paddingBottom: 28 }}>
      <SheetTitle hint={lede}>Reminder</SheetTitle>
      <OptionGroup label="Reminder">
        {OPTIONS.map((o, i) => (
          <OptionRow
            key={String(o)}
            label={reminderLabel(o)}
            hint={hintFor(o)}
            selected={value === o}
            last={i === OPTIONS.length - 1}
            onPress={() => {
              onChange(o);
              close();
            }}
          />
        ))}
      </OptionGroup>
      <AppText tone="secondary" style={{ fontSize: 13, textAlign: 'center' }}>
        {`Tasks without a time remind you at ${formatTime(UNTIMED)} on the day.`}
      </AppText>
    </SheetCard>
  );
}
