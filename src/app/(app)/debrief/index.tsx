import { Redirect } from 'expo-router';
import { useDesk } from '@/desktop/layout';
import { DebriefDesk } from '@/desktop/views/DebriefDesk';

/**
 * The morning debrief (docs/13 §2.2). The computer version is built; on the phone the full-screen
 * check-in stays in its place until the phone debrief is built.
 */
export default function DebriefRoute() {
  const { desk } = useDesk();
  return desk ? <DebriefDesk /> : <Redirect href="/checkin" />;
}
