import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Check } from '@/components/Check';
import { PressScale } from '@/components/PressScale';
import { timeRange } from '@/lib/dates';
import { eventEnd, eventStart, type GEvent } from '@/lib/events';
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
  /** Google events on the day (VToday shows them in the same schedule). */
  events?: GEvent[];
  /** "last seen 09:00" when Google can't be reached (NGoogleFailed). */
  stale?: string | null;
  onOpenEvent?: (id: string) => void;
  onHideEvent?: (id: string) => void;
};

type Entry = { kind: 'task'; task: Task; at: string } | { kind: 'event'; event: GEvent; at: string };

/** VToday schedule: thin accent line with rings; the current item is a filled accent card with a bigger ring. */
export function Timeline({ tasks, currentId, lists, onOpen, onLongPress, onToggle, events = [], stale, onOpenEvent, onHideEvent }: Props) {
  const { c } = useTheme();
  const entries: Entry[] = [
    ...tasks.map((task) => ({ kind: 'task' as const, task, at: task.startTime ?? '' })),
    ...events.map((event) => ({ kind: 'event' as const, event, at: eventStart(event) ?? '' })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <View style={styles.wrap}>
      {entries.map((entry, i) => {
        const first = i === 0;
        const last = i === entries.length - 1;
        if (entry.kind === 'event') {
          const e = entry.event;
          return (
            <View key={e.id} style={[styles.row, stale ? { opacity: 0.55 } : null]}>
              <View style={styles.rail} aria-hidden>
                <View style={{ width: 2, height: 30, backgroundColor: first ? 'transparent' : c.accent }} />
                <View style={{ width: 14, height: 14, borderRadius: 10, borderWidth: 2, borderColor: c.accent, backgroundColor: c.ground }} />
                <View style={{ flex: 1, width: 2, backgroundColor: last ? 'transparent' : c.accent }} />
              </View>
              <View style={styles.cardWrap}>
                <View style={[styles.card, { backgroundColor: c.card }]}>
                  <PressScale kind="row" accessibilityRole="button" accessibilityHint="Opens the Google event" onPress={() => onOpenEvent?.(e.id)} style={styles.text}>
                    <AppText style={[styles.title, { color: c.text }]}>{e.title}</AppText>
                    <AppText variant="secondary" tone="secondary">
                      {`${timeRange(eventStart(e), eventEnd(e))} · ${stale ? `Google · last seen ${stale}` : 'Google Calendar'}`}
                    </AppText>
                  </PressScale>
                  {stale ? <View style={{ width: 44 }} /> : <Check done={false} label={`Hide ${e.title} from your list`} onToggle={() => onHideEvent?.(e.id)} />}
                </View>
              </View>
            </View>
          );
        }
        const t = entry.task;
        const now = t.id === currentId;
        const done = !!t.doneAt;
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
