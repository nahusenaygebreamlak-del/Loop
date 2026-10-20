import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View, type StyleProp, type ViewInstance, type ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { Check } from '@/components/Check';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useTaskActions } from '@/features/useTaskActions';
import type { Task } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { useContextMenu, useDraggable } from './dom';
import { Kbd } from './Kbd';
import { useOpenTaskMenu } from './Menu';
import { selectTask, useDeskState } from './state';

/** The main column (.main): 30 / 36 / 40 padding, scrolls. */
export function DeskPage({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { c } = useTheme();
  if (!scroll) return <View style={{ flex: 1, paddingTop: 30, paddingHorizontal: 36, paddingBottom: 24, backgroundColor: c.ground }}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.ground }} contentContainerStyle={{ paddingTop: 30, paddingHorizontal: 36, paddingBottom: 80 }}>
      {children}
    </ScrollView>
  );
}

/** Header: small date / context line, 34 px title, actions on the right. */
export function DeskHeader({ pre, preLead, title, actions }: { pre?: string; preLead?: ReactNode; title: ReactNode; actions?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
      <View style={{ flexShrink: 1 }}>
        {pre ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {preLead}
            <AppText style={{ fontSize: 14.5, color: c.textSecondary }}>{pre}</AppText>
          </View>
        ) : null}
        <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 34, lineHeight: 38, letterSpacing: -0.68, marginTop: 2 }}>
          {title}
        </AppText>
      </View>
      {actions ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>{actions}</View> : null}
    </View>
  );
}

/** The primary action (.btnp) always shows its key: "Add task  Q". */
export function KeyButton({ label, k, icon = 'plus', onPress, small }: { label: string; k?: string; icon?: IconName | null; onPress: () => void; small?: boolean }) {
  const { c } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityHint={k ? `Shortcut ${k}` : undefined}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: small ? 38 : 42, paddingLeft: icon ? 14 : 16, paddingRight: k ? 14 : 16, borderRadius: 13, backgroundColor: c.accent }}
    >
      {icon ? <Icon name={icon} size={20} strokeWidth={2.4} color={c.onAccent} /> : null}
      <AppText style={{ ...font(800), fontSize: small ? 13.5 : 14.5, color: c.onAccent }}>{label}</AppText>
      {k ? <Kbd k={k} onAccent /> : null}
    </PressScale>
  );
}

/** Secondary button (.btns): white, or grey on a white card. */
export function SoftButton({ label, onPress, onCard, k, tone }: { label: string; onPress: () => void; onCard?: boolean; k?: string; tone?: 'accent' | 'danger' }) {
  const { c } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingHorizontal: 16, borderRadius: 13, backgroundColor: onCard ? c.ground : c.card }}
    >
      <AppText style={{ ...font(700), fontSize: 14, color: tone === 'accent' ? c.accentText : tone === 'danger' ? c.dangerText : c.text }}>{label}</AppText>
      {k ? <Kbd k={k} /> : null}
    </PressScale>
  );
}

/** 42 px white icon button (.ib2), e.g. the list ⋯. */
export function IconButton2({ icon, label, onPress }: { icon: IconName; label: string; onPress: (x: number, y: number) => void }) {
  const { c } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={(e) => {
        const n = e.nativeEvent as unknown as { pageX: number; pageY: number };
        onPress(n.pageX, n.pageY + 16);
      }}
      style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={icon} size={20} color={c.text} />
    </PressScale>
  );
}

/** Group label (.lab): 14 / 700, secondary (red for Overdue). */
export function GroupLab({ children, danger, first }: { children: string; danger?: boolean; first?: boolean }) {
  const { c } = useTheme();
  return <AppText style={{ ...font(700), fontSize: 14, color: danger ? c.dangerText : c.textSecondary, paddingTop: first ? 24 : 20, paddingBottom: 10 }}>{children}</AppText>;
}

/** White group card, 18 px corners. */
export function DeskCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ backgroundColor: c.card, borderRadius: 18, overflow: 'hidden' }, style]}>{children}</View>;
}

/**
 * A 56 px task row: click selects it into the panel, right-click opens quick actions,
 * drag it onto a list, tag, day or time. The selected row uses the tint.
 */
export function TaskRowDesk({
  task,
  sub,
  subTone,
  right,
  last,
  hoverAction,
}: {
  task: Task;
  sub?: ReactNode;
  subTone?: 'danger' | 'warn';
  right?: ReactNode;
  last?: boolean;
  hoverAction?: ReactNode;
}) {
  const { c } = useTheme();
  const actions = useTaskActions();
  const openMenu = useOpenTaskMenu();
  const selected = useDeskState((s) => s.selected?.kind === 'task' && s.selected.id === task.id);
  const dragRef = useDraggable<ViewInstance>({ kind: 'task', id: task.id });
  const menuRef = useContextMenu<ViewInstance>((x, y) => openMenu(task.id, x, y));
  const [hover, setHover] = useState(false);
  const done = !!task.doneAt;
  return (
    <View ref={dragRef}>
      <View ref={menuRef}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityHint="Opens it in the panel. Right-click for quick actions."
          onPress={() => selectTask(task.id)}
          onHoverIn={() => setHover(true)}
          onHoverOut={() => setHover(false)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            minHeight: 56,
            paddingVertical: 6,
            paddingLeft: 18,
            paddingRight: 10,
            borderBottomWidth: last ? 0 : 1,
            borderBottomColor: c.ground,
            backgroundColor: selected ? c.tint : hover ? c.desk.hover : 'transparent',
            cursor: 'pointer',
          } as object}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText numberOfLines={1} style={{ ...font(done ? 600 : 700), fontSize: 15, color: done ? c.textSecondary : c.text, textDecorationLine: done ? 'line-through' : 'none' }}>
              {task.title}
            </AppText>
            {sub ? (
              typeof sub === 'string' ? (
                <AppText numberOfLines={1} style={{ fontSize: 13, marginTop: 2, color: subTone === 'danger' ? c.dangerText : subTone === 'warn' ? c.warnText : c.textSecondary }}>
                  {sub}
                </AppText>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>{sub}</View>
              )
            ) : null}
          </View>
          {hover && hoverAction ? hoverAction : null}
          {right}
          <Check done={done} priority={task.priority} label={task.title} onToggle={() => actions.toggle(task.id)} />
        </Pressable>
      </View>
    </View>
  );
}

/** Empty / all-done card (.dempty). */
export function DeskEmpty({ icon, glyph, tick, title, text, children }: { icon?: IconName; glyph?: string; tick?: boolean; title: string; text: string; children?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="summary" style={{ backgroundColor: c.card, borderRadius: 22, paddingVertical: 48, paddingHorizontal: 28, alignItems: 'center', gap: 8, marginTop: 22 }}>
      {tick ? (
        <View aria-hidden style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Icon name="check" size={30} strokeWidth={2.6} color={c.onAccent} />
        </View>
      ) : (
        <View aria-hidden style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
          {icon ? <Icon name={icon} size={26} color={c.accentText} /> : <AppText style={{ ...font(800), fontSize: 24, color: c.accentText }}>{glyph}</AppText>}
        </View>
      )}
      <AppText style={{ ...font(800), fontSize: 19, textAlign: 'center' }}>{title}</AppText>
      <AppText tone="secondary" style={{ fontSize: 14.5, lineHeight: 22, textAlign: 'center', maxWidth: 380 }}>
        {text}
      </AppText>
      {children ? <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>{children}</View> : null}
    </View>
  );
}

/** Banner (.banner): offline, Google not reachable. */
export function Banner({ icon, iconBg, iconFg, title, text, right }: { icon: IconName; iconBg: string; iconFg: string; title: string; text: string; right?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.card, borderRadius: 16, paddingVertical: 12, paddingLeft: 16, paddingRight: 12, marginTop: 18 }}>
      <View aria-hidden style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={iconFg} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ ...font(800), fontSize: 14.5 }}>{title}</AppText>
        <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 2 }}>
          {text}
        </AppText>
      </View>
      {right}
    </View>
  );
}

/** Tells the keyboard handler which rows ↑ / ↓ walk through. */
export function useRows(ids: string[]) {
  const key = ids.join(',');
  useEffect(() => {
    useDeskState.setState({ rows: key ? key.split(',') : [] });
  }, [key]);
}
