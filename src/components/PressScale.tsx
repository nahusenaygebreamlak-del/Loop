import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { motion } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** 'button' shrinks to 96 %, 'row' to 98.5 % (motion.press). */
  kind?: 'button' | 'row';
};

export function PressScale({ kind = 'button', style, onPressIn, onPressOut, onLongPress, ...rest }: Props) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const target = kind === 'row' ? motion.press.rowScale : motion.press.scale;
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      onLongPress={
        onLongPress
          ? (e) => {
              haptic('medium');
              onLongPress(e);
            }
          : undefined
      }
      style={[style, animated]}
      onPressIn={(e) => {
        if (!reduced) scale.set(withTiming(target, { duration: motion.press.duration }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduced) scale.set(withTiming(1, { duration: motion.press.duration }));
        onPressOut?.(e);
      }}
    />
  );
}
