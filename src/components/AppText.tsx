import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { type, type TypeVariant } from '@/theme/typography';

type Props = TextProps & {
  variant?: TypeVariant;
  tone?: 'text' | 'secondary' | 'accent' | 'danger' | 'onAccent';
};

export function AppText({ variant = 'body', tone = 'text', style, ...rest }: Props) {
  const { c } = useTheme();
  const color: Record<NonNullable<Props['tone']>, string> = {
    text: c.text,
    secondary: c.textSecondary,
    accent: c.accentText,
    danger: c.dangerText,
    onAccent: c.onAccent,
  };
  const base: TextStyle = { ...type[variant], color: color[tone] };
  return <Text {...rest} style={[base, style]} />;
}
