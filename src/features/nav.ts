import { router, type Href } from 'expo-router';

/**
 * Main sections sit one level above Today, so Back from any of them returns to Today.
 * The push waits a tick: dismissing and pushing in the same tick races in Expo Router.
 */
export function goMain(href: Href) {
  if (router.canDismiss()) router.dismissAll();
  if (href !== '/') setTimeout(() => router.push(href), 0);
}

/** Back, or Today when there is nothing to go back to (e.g. a reloaded web page). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
