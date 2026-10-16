import { Redirect } from 'expo-router';

// The OAuth deep link (loop://auth/callback) is handled by WebBrowser in lib/auth.
// If the router sees it too, just go home.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
