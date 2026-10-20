import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticKind = 'tick' | 'light' | 'medium' | 'success' | 'warning';

/**
 * Small, purposeful vibrations: a tick per wheel step, light taps for toggles and long-press,
 * success when a task is done. Never on web.
 */
export function haptic(kind: HapticKind) {
  if (Platform.OS === 'web') return;
  const run = () => {
    switch (kind) {
      case 'tick':
        return Haptics.selectionAsync();
      case 'light':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'medium':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };
  void run().catch(() => {});
}
