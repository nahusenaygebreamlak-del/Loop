import type { TextStyle } from 'react-native';
import raw from '@design/tokens.json';

// On Android each weight of a custom font is its own family, so map weight → family name.
export const fontFamily = {
  300: 'PlusJakartaSans_300Light',
  400: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
} as const;

export type FontWeight = keyof typeof fontFamily;

export function font(weight: number): TextStyle {
  return { fontFamily: fontFamily[weight as FontWeight] ?? fontFamily[400] };
}

type ScaleEntry = { size: number; weight: number; lineHeight?: number; letterSpacing?: string };
export type TypeVariant = keyof typeof raw.font.scale;

function toStyle(entry: ScaleEntry): TextStyle {
  return {
    ...font(entry.weight),
    fontSize: entry.size,
    ...(entry.lineHeight ? { lineHeight: Math.round(entry.size * entry.lineHeight) } : null),
    ...(entry.letterSpacing?.endsWith('em') ? { letterSpacing: parseFloat(entry.letterSpacing) * entry.size } : null),
  };
}

export const type = Object.fromEntries(
  Object.entries(raw.font.scale).map(([k, v]) => [k, toStyle(v as ScaleEntry)]),
) as Record<TypeVariant, TextStyle>;
