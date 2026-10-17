import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { easingCurve, motion, radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressScale } from './PressScale';

/** 44 px icon button (.ib). */
export function IconButton({ icon, label, onPress, style, iconSize = 22 }: { icon: IconName; label: string; onPress?: () => void; style?: StyleProp<ViewStyle>; iconSize?: number }) {
  const { c } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Icon name={icon} size={iconSize} color={c.text} />
    </PressScale>
  );
}

/** Grey group label (.lab), e.g. "Anytime today · 2". */
export function GroupLabel({ children, tone = 'secondary', style }: { children: ReactNode; tone?: 'secondary' | 'danger'; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingHorizontal: size.sideMargin, paddingTop: 22, paddingBottom: 10 }, style]}>
      <AppText variant="label" tone={tone} accessibilityRole="header">
        {children}
      </AppText>
    </View>
  );
}

/** Plain white card group (.grp). */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ marginHorizontal: size.sideMargin, backgroundColor: c.card, borderRadius: radius.card, overflow: 'hidden' }, style]}>{children}</View>;
}

/** Quiet empty state in the style of "Nothing planned for the next 7 days." */
/** Small uppercase label (.cap) above a control in a sheet. */
export function CapLabel({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={style}>
      <AppText style={{ ...font(700), fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', color: c.textSecondary }}>{children}</AppText>
    </View>
  );
}

/** Small rounded list-colour square. */
export function Swatch({ color, size: s = 14 }: { color: string; size?: number }) {
  return <View style={{ width: s, height: s, borderRadius: s >= 14 ? 4 : 3, backgroundColor: color }} />;
}

/** The + button: 64 px accent rounded square, bottom centre, over a fade of the ground colour. */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0.92);
  const opacity = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    const ease = Easing.bezier(...easingCurve);
    const d = motion.fabIn.duration;
    opacity.value = withDelay(motion.fabIn.delay, withTiming(1, { duration: d * 0.6 }));
    scale.value = withDelay(motion.fabIn.delay, withSequence(withTiming(1.02, { duration: d * 0.6, easing: ease }), withTiming(1, { duration: d * 0.4, easing: ease })));
  }, [reduced, scale, opacity]);

  const pop = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <View pointerEvents="box-none" style={[styles.fabZone, { height: 120 + insets.bottom, paddingBottom: insets.bottom }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[c.ground + '00', c.ground, c.ground]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={pop}>
        <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.fab, { backgroundColor: c.accent }]}>
          <Icon name="plus" size={28} strokeWidth={2.4} color={c.onAccent} />
        </PressScale>
      </Animated.View>
    </View>
  );
}

/** Primary sheet button (56 px, accent). */
export function SheetButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: size.primaryButtonHeight, borderRadius: radius.button, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}
    >
      <AppText variant="button" tone="onAccent">
        {label}
      </AppText>
    </PressScale>
  );
}

export function SheetTitle({ children, hint }: { children: string; hint?: string }) {
  return (
    <View>
      <AppText variant="sheetTitle" accessibilityRole="header">
        {children}
      </AppText>
      {hint ? (
        <AppText tone="secondary" style={{ fontSize: 14, marginTop: 6 }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

/** Radio circle (.rad): 24 px, ring 2 px; selected = 7 px accent ring. */
export function Radio({ on }: { on: boolean }) {
  const { c } = useTheme();
  return <View style={{ marginLeft: 'auto', width: 24, height: 24, borderRadius: 12, borderWidth: on ? 7 : 2, borderColor: on ? c.accent : c.line }} />;
}

/** Grey rounded group holding option rows (NPriority, NRepeat, NMoveList). */
export function OptionGroup({ children, label }: { children: ReactNode; label?: string }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ backgroundColor: c.ground, borderRadius: radius.card, overflow: 'hidden' }}>
      {children}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.ground, marginLeft: inset }} />;
}

export const textStyles = StyleSheet.create({
  rowTitle: { ...font(700), fontSize: 16, lineHeight: 21 },
});

const styles = StyleSheet.create({
  fabZone: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  fab: { width: size.fab, height: size.fab, borderRadius: radius.fab, alignItems: 'center', justifyContent: 'center' },
});
