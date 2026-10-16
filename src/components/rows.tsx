import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, size } from '@/theme/tokens';
import { font } from '@/theme/typography';
import type { Task } from '@/store/types';
import { AppText } from './AppText';
import { Check } from './Check';
import { ContentIn } from './ContentIn';
import { IconButton } from './ui';
import { PressScale } from './PressScale';

/**
 * Task row used by Next 7 Days, All tasks, Tag view and Search (.r / .t / .s).
 * `sub` may be text or a node (Tag view puts a list swatch in it).
 */
export function TaskRow({
  task,
  sub,
  subDanger,
  last,
  onOpen,
  onLongPress,
  onToggle,
  title,
}: {
  task: Task;
  sub?: ReactNode;
  subDanger?: boolean;
  last?: boolean;
  onOpen: () => void;
  onLongPress?: () => void;
  onToggle: () => void;
  title?: ReactNode;
}) {
  const { c } = useTheme();
  const done = !!task.doneAt;
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: c.ground }]}>
      <PressScale
        kind="row"
        accessibilityRole="button"
        accessibilityHint={onLongPress ? 'Opens task details. Long press for quick actions.' : 'Opens task details.'}
        onPress={onOpen}
        onLongPress={onLongPress}
        style={{ flex: 1, minWidth: 0 }}
      >
        <AppText style={[styles.title, done && { color: c.textSecondary, textDecorationLine: 'line-through' }]}>{title ?? task.title}</AppText>
        {sub ? (
          typeof sub === 'string' ? (
            <AppText style={[styles.sub, { color: subDanger ? c.dangerText : c.textSecondary }]}>{sub}</AppText>
          ) : (
            <View style={styles.subRow}>{sub}</View>
          )
        ) : null}
      </PressScale>
      <Check done={done} priority={task.priority} label={task.title} onToggle={onToggle} />
    </View>
  );
}

/** "Show 4 more" row at the end of a card. */
export function ShowMoreRow({ count, onPress }: { count: number; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale kind="row" accessibilityRole="button" onPress={onPress} style={[styles.row, { minHeight: 56 }]}>
      <AppText style={{ ...font(700), fontSize: 14.5, color: c.accentText }}>Show {count} more</AppText>
    </PressScale>
  );
}

/** Filter / group-by chips (.f in NAllTasks and NCompleted): white, selected = dark. */
export function FilterChips<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const { c } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={label}
      contentContainerStyle={{ gap: 8, paddingHorizontal: size.sideMargin, paddingTop: 18 }}
      style={{ flexGrow: 0 }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressScale
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', backgroundColor: on ? c.text : c.card }}
          >
            <AppText style={{ ...font(700), fontSize: 14, color: on ? c.ground : c.text }}>{o.label}</AppText>
          </PressScale>
        );
      })}
    </ScrollView>
  );
}

/** Main-screen header: menu, optional right action, grey line, big title. */
export function ScreenHeader({
  subtitle,
  title,
  onMenu,
  right,
  lead,
}: {
  subtitle?: ReactNode;
  title: ReactNode;
  onMenu: () => void;
  right?: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <View style={{ paddingTop: 18, paddingHorizontal: size.sideMargin }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="menu" label="Open menu" iconSize={24} style={{ marginLeft: -10 }} onPress={onMenu} />
        {right}
      </View>
      {subtitle ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
          {lead}
          {typeof subtitle === 'string' ? (
            <AppText tone="secondary" style={{ fontSize: 15 }}>
              {subtitle}
            </AppText>
          ) : (
            subtitle
          )}
        </View>
      ) : null}
      <ContentIn>
        <AppText variant="display" accessibilityRole="header" style={{ marginTop: 4 }}>
          {title}
        </AppText>
      </ContentIn>
    </View>
  );
}

/** Scrolling main screen with room for the + button. */
export function MainScroll({ children, fab }: { children: ReactNode; fab?: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top, paddingBottom: (fab ? 140 : 40) + insets.bottom }}>
        {children}
      </ScrollView>
      {fab}
    </View>
  );
}

/** Small list swatch + name, used inside sub-lines (NTagView). */
export function ListTag({ name, color }: { name: string; color: keyof typeof listColors }) {
  return (
    <>
      <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: listColors[color] }} />
      <AppText tone="secondary" style={{ fontSize: 13.5 }}>
        {name}
      </AppText>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingVertical: 8, paddingLeft: 20, paddingRight: 12 },
  title: { ...font(700), fontSize: 15.5, lineHeight: 20 },
  sub: { fontSize: 13.5, marginTop: 3 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
});
