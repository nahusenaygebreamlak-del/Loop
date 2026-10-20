// Single source of truth: design/tokens.json (from the design hand-off).
import raw from '@design/tokens.json';

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | ColorScheme;

type LightColors = typeof raw.color.light;
export type ThemeColors = LightColors & { dangerRing: string; priorityMediumText: string; warn: string; warnText: string; warnTint: string; cal: CalColors; desk: DeskColors; priority: Record<'high' | 'medium' | 'low' | 'none', string> };

type DeskColors = { kbdBg: string; kbdText: string; border: string; scrim: string; hover: string; eventRow: string; hour: string };

// Computer layout (W* / DW* designs, 20 Oct): key caps, pop-up borders and scrim, menu hover.
const DESK: Record<ColorScheme, DeskColors> = {
  light: { kbdBg: '#E4E8F1', kbdText: '#636B80', border: '#E4E8F1', scrim: 'rgba(20,26,46,0.32)', hover: '#F2F4F9', eventRow: '#E9EDF5', hour: '#EEF1F6' },
  dark: { kbdBg: '#232B3D', kbdText: '#9AA3B8', border: '#232B3D', scrim: 'rgba(0,0,0,0.55)', hover: '#0F1320', eventRow: '#202838', hour: '#232B3D' },
};

type CalColors = { eventBg: string; eventText: string; agendaEvent: string; segBg: string; hour: string; taskBg: string; taskText: string; eventDot: string; nowLine: string };

// Calendar blocks (VCalendar, NCalWeek, NCalDay and their dark twins), added 18 Oct.
const CAL: Record<ColorScheme, CalColors> = {
  light: { eventBg: '#E4E8F1', eventText: '#4A5266', agendaEvent: '#E9EDF5', segBg: '#E4E8F1', hour: '#EEF1F6', taskBg: '#DCE6FB', taskText: '#1F55C4', eventDot: '#9AA3B5', nowLine: '#C7372F' },
  dark: { eventBg: '#232B3D', eventText: '#B7BFD0', agendaEvent: '#202838', segBg: '#232B3D', hour: '#232B3D', taskBg: '#1E2D52', taskText: '#9DB9FF', eventDot: '#9AA3B5', nowLine: '#C7372F' },
};

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
    cal: CAL[scheme],
    desk: DESK[scheme],
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
