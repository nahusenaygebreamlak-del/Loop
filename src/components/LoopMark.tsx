import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { LoopMarkSvg } from './Brand';

/** The mark in a rounded accent tile (side menu, sync line). The mark fills 54 % of the tile. */
export function LoopMarkTile({ size = 44 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <View aria-hidden style={{ width: size, height: size, borderRadius: size * (15 / 44), backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
      <LoopMarkSvg size={size * 0.54} color={c.onAccent} />
    </View>
  );
}
