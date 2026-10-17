import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressScale } from './PressScale';

export type EmptyAction = { label: string; onPress: () => void; primary?: boolean };

/**
 * The one empty-state pattern (NEmptyStates): white card, tinted 56 px icon tile, 17/800 title,
 * one line of help, at most a couple of chips. `fill` centres it in the remaining screen.
 */
export function EmptyState({
  icon,
  glyph,
  title,
  text,
  actions,
  fill,
  children,
  style,
}: {
  icon?: IconName;
  glyph?: string;
  title: string;
  text: string;
  actions?: EmptyAction[];
  fill?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const card = (
    <View
      accessible
      accessibilityRole="summary"
      style={[{ marginHorizontal: size.sideMargin, borderRadius: 22, paddingVertical: 30, paddingHorizontal: 24, backgroundColor: c.card, alignItems: 'center', gap: 8 }, style]}
    >
      <View aria-hidden style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
        {icon ? <Icon name={icon} size={26} color={c.accentText} /> : <AppText style={{ ...font(800), fontSize: 24, color: c.accentText }}>{glyph}</AppText>}
      </View>
      <AppText style={{ ...font(800), fontSize: 17, textAlign: 'center' }}>{title}</AppText>
      <AppText tone="secondary" style={{ fontSize: 14.5, lineHeight: 22, textAlign: 'center', maxWidth: 280 }}>
        {text}
      </AppText>
      {children}
      {actions?.length ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {actions.map((a) => (
            <Chip key={a.label} {...a} />
          ))}
        </View>
      ) : null}
    </View>
  );
  if (!fill) return card;
  return <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 110 }}>{card}</View>;
}

/** Chip button (.chip / .chip.on): grey, or accent when primary. */
export function Chip({ label, onPress, primary }: EmptyAction) {
  const { c } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, justifyContent: 'center', backgroundColor: primary ? c.accent : c.ground }}
    >
      <AppText style={{ ...font(700), fontSize: 14.5, color: primary ? c.onAccent : c.text }}>{label}</AppText>
    </PressScale>
  );
}
