import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';

/** A key cap (kbd): shown next to every action that has a key. `onAccent` on blue buttons. */
export function Kbd({ k, onAccent, onDark, style }: { k: string; onAccent?: boolean; onDark?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const bg = onAccent ? 'rgba(255,255,255,0.2)' : onDark ? 'rgba(255,255,255,0.14)' : c.desk.kbdBg;
  const fg = onAccent ? '#FFFFFF' : onDark ? '#C9D2E3' : c.desk.kbdText;
  return (
    <View aria-hidden style={[{ minWidth: 20, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: bg, alignItems: 'center' }, style]}>
      <AppText style={{ ...font(700), fontSize: 11.5, lineHeight: 15, color: fg }}>{k}</AppText>
    </View>
  );
}

/** "↑ ↓ move  Space done …" hint row. */
export function KeyHints({ items, style }: { items: [string[], string][]; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 18 }, style]}>
      {items.map(([keys, label]) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {keys.map((k) => (
            <Kbd key={k} k={k} />
          ))}
          <AppText style={{ fontSize: 12.5, color: c.textSecondary, marginLeft: 2 }}>{label}</AppText>
        </View>
      ))}
    </View>
  );
}
