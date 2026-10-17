import { useEffect } from 'react';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

/** Small ring spinner (tint ring, accent arc), as in NAccountNoGoogle and the sync line. */
export function Spinner({ size = 18, color, track }: { size?: number; color?: string; track?: string }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    turn.set(withRepeat(withTiming(1, { duration: 800, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(turn);
  }, [reduced, turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }));
  return (
    <Animated.View
      aria-hidden
      style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: size > 14 ? 2.5 : 2, borderColor: track ?? c.tint, borderTopColor: color ?? c.accent }, style]}
    />
  );
}
