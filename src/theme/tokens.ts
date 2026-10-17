// Single source of truth: design/tokens.json (from the design hand-off).
import raw from '@design/tokens.json';

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | ColorScheme;

type LightColors = typeof raw.color.light;
export type ThemeColors = LightColors & { dangerRing: string; priorityMediumText: string; warn: string; warnText: string; warnTint: string; priority: Record<'high' | 'medium' | 'low' | 'none', string> };

function buildColors(scheme: ColorScheme): ThemeColors {
  const base = raw.color[scheme] as LightColors & { dangerRing?: string };
  const dangerRing = base.dangerRing ?? base.danger;
  return {
    ...base,
    dangerRing,
    priorityMediumText: scheme === 'dark' ? raw.color.priority.mediumTextDark : raw.color.priority.mediumText,
    // Orange warnings (NNotifOff, NSnackbars sync error, NCarriedOver), added 17 Oct.
    warn: '#D9822B',
    warnText: scheme === 'dark' ? '#F0A35C' : '#B4600F',
    warnTint: scheme === 'dark' ? '#3A2A18' : '#FFF1E2',
    // Tokens note: in dark mode, high uses dangerRing and none uses line.
    priority: {
      high: scheme === 'dark' ? dangerRing : raw.color.priority.high,
      medium: raw.color.priority.medium,
      low: raw.color.priority.low,
      none: scheme === 'dark' ? base.line : raw.color.priority.none,
    },
  };
}

export const colors: Record<ColorScheme, ThemeColors> = {
  light: buildColors('light'),
  dark: buildColors('dark'),
};

export const listColors = raw.color.lists;
export type ListColorName = keyof typeof listColors;

export const radius = raw.radius;
export const size = raw.size;
export const spacing = raw.spacing;
export const motion = raw.motion;

// Motion easing from tokens: cubic-bezier(.2,.9,.25,1)
export const easingCurve = [0.2, 0.9, 0.25, 1] as const;
