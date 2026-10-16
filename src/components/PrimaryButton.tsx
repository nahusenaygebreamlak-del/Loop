import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size } from '@/theme/tokens';
import { AppText } from './AppText';
import { PressScale } from './PressScale';

type Props = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

export function PrimaryButton({ label, onPress, icon, loading, disabled, accessibilityHint }: Props) {
  const { c } = useTheme();
  const inactive = disabled || loading;
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={[styles.button, { backgroundColor: c.accent, opacity: disabled ? 0.5 : 1 }]}
    >
      {loading ? <ActivityIndicator color={c.onAccent} /> : icon ? <View>{icon}</View> : null}
      <AppText variant="button" tone="onAccent">
        {label}
      </AppText>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  button: {
    // Sign-in uses 58; the token primary height is 56. Use the larger so both fit.
    minHeight: size.primaryButtonHeight + 2,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
});
