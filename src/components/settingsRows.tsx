import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { AppText } from './AppText';
import { PressScale } from './PressScale';
import { SwitchKnob } from './Switch';
import { haptic } from '@/lib/haptics';

/** Settings row (.set): name + optional hint on the left, value / switch / chevron on the right. */
export function SetRow({
  name,
  hint,
  value,
  valueMuted,
  valueStrike,
  hintColor,
  danger,
  toggle,
  trailing,
  lead,
  last,
  onPress,
}: {
  name: string;
  hint?: string;
  value?: string;
  valueMuted?: boolean;
  valueStrike?: boolean;
  hintColor?: string;
  danger?: boolean;
  toggle?: boolean;
  trailing?: ReactNode;
  lead?: ReactNode;
  last?: boolean;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const content = (
    <>
      {lead}
      <View style={{ flex: 1 }}>
        <AppText style={{ ...font(700), fontSize: 15, color: danger ? c.dangerText : c.text }}>{name}</AppText>
        {hint ? (
          <AppText tone="secondary" style={[{ ...font(500), fontSize: 12.5, marginTop: 2 }, hintColor ? { color: hintColor } : null]}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {value ? <AppText style={{ ...font(700), fontSize: 14.5, color: valueMuted ? c.textSecondary : c.accentText, fontVariant: ['tabular-nums'], textDecorationLine: valueStrike ? 'line-through' : 'none' }}>{value}</AppText> : null}
      {toggle !== undefined ? <SwitchKnob on={toggle} /> : null}
      {trailing}
    </>
  );
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 56, paddingVertical: 7, paddingLeft: 20, paddingRight: 18, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.ground };
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <PressScale
      kind="row"
      accessibilityRole={toggle !== undefined ? 'switch' : 'button'}
      accessibilityState={toggle !== undefined ? { checked: toggle } : undefined}
      accessibilityLabel={[name, hint, value].filter(Boolean).join(', ')}
      onPress={() => {
        if (toggle !== undefined) haptic('light');
        onPress();
      }}
      style={style}
    >
      {content}
    </PressScale>
  );
}
