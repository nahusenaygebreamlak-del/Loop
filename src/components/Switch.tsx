import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

/** Toggle (.tg): 48 × 28 track, 22 px knob; on = accent. Purely visual; the row is the switch. */
export function SwitchKnob({ on }: { on: boolean }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const x = useSharedValue(on ? 20 : 0);
  useEffect(() => {
    x.set(reduced ? (on ? 20 : 0) : withTiming(on ? 20 : 0, { duration: 180 }));
  }, [on, reduced, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View aria-hidden style={{ width: 48, height: 28, borderRadius: 14, backgroundColor: on ? c.accent : c.line, justifyContent: 'center', paddingHorizontal: 3 }}>
      <Animated.View style={[{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' }, knob]} />
    </View>
  );
}
