import { Redirect } from 'expo-router';
import { useDesk } from '@/desktop/layout';
import { SeasonSetupDesk } from '@/desktop/views/SeasonSetupDesk';

/**
 * Season setup with the coach (docs/13 §2.4, §18). Built on the computer first; on the phone
 * the form stays in its place until the phone version is built.
 */
export default function SeasonSetupRoute() {
  const { desk } = useDesk();
  return desk ? <SeasonSetupDesk /> : <Redirect href="/season/manual" />;
}
