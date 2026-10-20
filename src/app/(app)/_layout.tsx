import { Slot, Stack } from 'expo-router';
import { DeskShell } from '@/desktop/DeskShell';
import { useDesk } from '@/desktop/layout';
import { useTheme } from '@/theme/ThemeProvider';

export default function AppLayout() {
  const { c } = useTheme();
  const { desk } = useDesk();
  // Computer (web, 600 px and wider): sidebar + main + detail panel; each screen draws its computer version.
  if (desk) {
    return (
      <DeskShell>
        <Slot />
      </DeskShell>
    );
  }
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ground } }} />;
}
