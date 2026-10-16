import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

export default function AppLayout() {
  const { c } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ground } }} />;
}
