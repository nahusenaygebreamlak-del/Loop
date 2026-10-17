import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { easingCurve, motion, size } from '@/theme/tokens';
import type { Priority } from '@/lib/parse';
import { Icon } from './Icon';
import { PressScale } from './PressScale';

const PRIORITY_KEY = ['none', 'low', 'medium', 'high'] as const;

type Props = {
  done: boolean;
  onToggle: () => void;
  priority?: Priority;
  /** On the filled "current" timeline card the ring is white. */
  onAccent?: boolean;
  label: string;
  /** Smaller circle (24 px in the note editor's checklist, NNoteFormats). */
  circle?: number;
};

/** Round check: 28 px circle with a 2 px ring inside a 44 px tap area. Ring colour = priority. */
export function Check({ done, onToggle, priority = 0, onAccent, label, circle = size.check.circle }: Props) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (done && !reduced) {
      const ease = Easing.bezier(...easingCurve);
      scale.value = 0.4;
      scale.value = withSequence(
        withTiming(1.18, { duration: motion.tickPop.duration * 0.55, easing: ease }),
        withTiming(1, { duration: motion.tickPop.duration * 0.45, easing: ease }),
      );
    }
  }, [done, reduced, scale]);

  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ring = onAccent ? c.onAccent : c.priority[PRIORITY_KEY[priority]];

  return (
    <PressScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={done ? `Mark not done: ${label}` : `Mark done: ${label}`}
      onPress={onToggle}
      hitSlop={4}
      style={{ width: size.check.tapArea, height: size.check.tapArea, alignItems: 'center', justifyContent: 'center' }}
    >
      {done ? (
        <Animated.View
          style={[
            {
              width: circle,
              height: circle,
              borderRadius: circle / 2,
              backgroundColor: c.accent,
              alignItems: 'center',
              justifyContent: 'center',
            },
            pop,
          ]}
        >
          <Icon name="check" size={circle < 28 ? 14 : 16} strokeWidth={3} color={c.onAccent} />
        </Animated.View>
      ) : (
        <View
          style={{
            width: circle,
            height: circle,
            borderRadius: circle / 2,
            borderWidth: size.check.border,
            borderColor: ring,
          }}
        />
      )}
    </PressScale>
  );
}
