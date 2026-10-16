import { View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useCloseSheet, SheetCard } from '@/components/Sheet';
import { OptionGroup, SheetTitle } from '@/components/ui';
import type { Priority } from '@/lib/parse';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { OptionRow } from './parts';

const OPTIONS: { p: Priority; label: string; key: 'high' | 'medium' | 'low' | 'none'; hint?: string }[] = [
  { p: 3, label: 'High', key: 'high', hint: 'Sorted to the top' },
  { p: 2, label: 'Medium', key: 'medium' },
  { p: 1, label: 'Low', key: 'low' },
  { p: 0, label: 'None', key: 'none' },
];

/** NPriority */
export function PrioritySheet({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  return (
    <SheetCard label="Priority" style={{ paddingBottom: 28 }}>
      <SheetTitle hint="Shows as the color of the task's check circle.">Priority</SheetTitle>
      <OptionGroup label="Priority">
        {OPTIONS.map((o, i) => (
          <OptionRow
            key={o.p}
            minHeight={62}
            label={o.label}
            hint={o.hint}
            selected={value === o.p}
            last={i === OPTIONS.length - 1}
            lead={<View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, borderColor: c.priority[o.key] }} />}
            onPress={() => {
              onChange(o.p);
              close();
            }}
          />
        ))}
      </OptionGroup>
      <AppText tone="secondary" style={{ fontSize: 13.5, textAlign: 'center' }}>
        Tip: type <AppText style={{ ...font(700), fontSize: 13.5 }}>!high</AppText> when adding a task
      </AppText>
    </SheetCard>
  );
}
