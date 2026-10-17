import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useKeyboardHeight } from '@/lib/useKeyboard';

/** A full-screen container whose bottom edge rides on top of the keyboard. */
export function KeyboardLift({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const keyboard = useKeyboardHeight();
  const lift = useAnimatedStyle(() => ({ paddingBottom: keyboard.value }));
  return <Animated.View style={[{ flex: 1 }, style, lift]}>{children}</Animated.View>;
}
