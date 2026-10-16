import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { easingCurve, motion } from '@/theme/tokens';

const ease = Easing.bezier(...easingCurve);

/** motion.contentIn: eases up 12 px and fades in. `index` staggers siblings. */
export function ContentIn({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      index * motion.contentIn.stagger,
      withTiming(1, { duration: motion.contentIn.duration, easing: ease }),
    );
  }, [reduced, index, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 12 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
