import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

/** The Loop app mark: a rounded accent square with the loop-and-tick glyph (NSignIn). */
export function LoopMark({ size = 88 }: { size?: number }) {
  const { c } = useTheme();
  const glyph = size * (46 / 88);
  return (
    <View
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size * (30 / 88),
        backgroundColor: c.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke={c.onAccent} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M19 12a7 7 0 1 1-2.05-4.95" />
        <Path d="M19 4v4h-4" />
        <Path d="M9 12.5l2 2 4-4.5" />
      </Svg>
    </View>
  );
}
