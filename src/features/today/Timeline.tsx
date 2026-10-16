import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Check } from '@/components/Check';
import { PressScale } from '@/components/PressScale';
import { timelineSub } from '@/lib/taskViews';
import type { List, Task } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { font } from '@/theme/typography';

type Props = {
  tasks: Task[];
  currentId: string | null;
  lists: List[];
  onOpen: (id: string) => void;
  onLongPress: (id: string) => void;
  onToggle: (id: string) => void;
};

/** VToday schedule: thin accent line with rings; the current item is a filled accent card with a bigger ring. */
export function Timeline({ tasks, currentId, lists, onOpen, onLongPress, onToggle }: Props) {
  const { c } = useTheme();
  return (
    <View style={styles.wrap}>
      {tasks.map((t, i) => {
        const now = t.id === currentId;
        const done = !!t.doneAt;
        const first = i === 0;
        const last = i === tasks.length - 1;
        return (
          <View key={t.id} style={styles.row}>
            <View style={styles.rail} aria-hidden>
              <View style={{ width: 2, height: now ? 27 : 30, backgroundColor: first ? 'transparent' : c.accent }} />
              <View
                style={{
                  width: now ? 20 : 14,
                  height: now ? 20 : 14,
                  borderRadius: 10,
                  borderWidth: now ? 5 : 2,
                  borderColor: c.accent,
                  backgroundColor: c.ground,
                }}
              />
              <View style={{ flex: 1, width: 2, backgroundColor: last ? 'transparent' : c.accent }} />
            </View>
            <View style={styles.cardWrap}>
              <View style={[styles.card, { backgroundColor: now ? c.accent : c.card }]}>
                <PressScale
                  kind="row"
                  accessibilityRole="button"
                  accessibilityHint="Opens task details. Long press for quick actions."
                  onPress={() => onOpen(t.id)}
                  onLongPress={() => onLongPress(t.id)}
                  style={styles.text}
                >
                  <AppText
                    style={[
                      styles.title,
                      { color: now ? c.onAccent : done ? c.textSecondary : c.text },
                      done && styles.struck,
                    ]}
                  >
                    {t.title}
                  </AppText>
                  <AppText variant="secondary" style={{ color: now ? c.onAccentSecondary : c.textSecondary }}>
                    {timelineSub(t, lists)}
                  </AppText>
                </PressScale>
                <Check done={done} priority={t.priority} onAccent={now} label={t.title} onToggle={() => onToggle(t.id)} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingLeft: 16, paddingRight: 24 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  rail: { width: 22, alignItems: 'center' },
  cardWrap: { flex: 1, minWidth: 0, paddingBottom: 12 },
  card: { borderRadius: radius.card, paddingVertical: 16, paddingLeft: 20, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0, gap: 6 },
  title: { ...font(700), fontSize: 16, lineHeight: 21 },
  struck: { textDecorationLine: 'line-through' },
});
