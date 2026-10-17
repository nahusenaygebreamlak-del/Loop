import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { easingCurve, motion } from '@/theme/tokens';

/** Success marks pop in (tickPop: scale .4 → 1.18 → 1), e.g. "All done", "Nothing left over". */
export function Pop({ children, style, delay = 100 }: { children: ReactNode; style?: StyleProp<ViewStyle>; delay?: number }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0.4);
  useEffect(() => {
    if (reduced) return;
    const ease = Easing.bezier(...easingCurve);
    const d = motion.tickPop.duration * 1.25;
    scale.set(withDelay(delay, withSequence(withTiming(1.18, { duration: d * 0.55, easing: ease }), withTiming(1, { duration: d * 0.45, easing: ease }))));
  }, [reduced, scale, delay]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** The red "now" dot breathes (nowDotPulse: a 6 px ring that fades, every 2 s). */
export function PulseDot({ color, size = 8, style }: { color: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.set(withRepeat(withTiming(1, { duration: motion.nowDotPulse.duration, easing: Easing.inOut(Easing.ease) }), -1, false));
    return () => cancelAnimation(t);
  }, [reduced, t]);
  const ring = useAnimatedStyle(() => {
    const p = t.get() < 0.5 ? t.get() * 2 : 0;
    return { transform: [{ scale: 1 + p * 1.5 }], opacity: 0.45 * (1 - p) };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, ring]} />
      <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </Animated.View>
  );
}
