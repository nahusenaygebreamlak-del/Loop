import { useEffect } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';
import { Easing, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

/**
 * Keyboard height as an animated value. Android draws edge-to-edge, so the window no longer
 * shrinks for the keyboard; screens and sheets lift themselves by this amount instead.
 */
export function useKeyboardHeight(): SharedValue<number> {
  const height = useSharedValue(0);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const ios = Platform.OS === 'ios';
    const ease = Easing.bezier(0.2, 0.9, 0.25, 1);
    const show = (e: KeyboardEvent) => height.set(withTiming(e.endCoordinates.height, { duration: ios ? e.duration || 250 : 220, easing: ease }));
    const hide = (e: KeyboardEvent) => height.set(withTiming(0, { duration: ios ? e.duration || 250 : 200, easing: ease }));
    const subs = [
      Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', show),
      Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', hide),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [height]);
  return height;
}
