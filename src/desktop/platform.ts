import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Which computer and browser Loop is running in (docs/13 §2.5, §9). Web only; everything is false on the phone.

const web = Platform.OS === 'web' && typeof navigator !== 'undefined';
const ua = web ? navigator.userAgent : '';

/** A Mac (or iPad pretending to be one): shortcuts show ⌘ instead of Ctrl. */
export const isMac = web && /Mac|iPhone|iPad/.test(navigator.platform || ua);

/** The modifier key label for this computer. The handlers already accept both keys. */
export const modKey = isMac ? '⌘' : 'Ctrl';

export type InstallBrowser = 'safari' | 'chromium' | 'other';

/** Safari can "Add to Dock"; Chrome and Edge can "Install"; nothing else can. */
export const installBrowser: InstallBrowser = !web ? 'other' : /Chrome|Chromium|Edg\//.test(ua) && !/OPR\//.test(ua) ? 'chromium' : /Safari/.test(ua) && !/Android/.test(ua) ? 'safari' : 'other';

export const browserName = /Edg\//.test(ua) ? 'Edge' : installBrowser === 'chromium' ? 'Chrome' : installBrowser === 'safari' ? 'Safari' : 'This browser';

/** True when Loop is running as an installed app (its own window, no address bar). */
export function isInstalled(): boolean {
  if (!web || typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

// Chrome and Edge hand over an install prompt once the page qualifies. Keep it until the person asks for it.
type InstallPrompt = Event & { prompt: () => Promise<unknown>; userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }> };
let saved: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((fn) => fn());

if (web && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    saved = e as InstallPrompt;
    tell();
  });
  window.addEventListener('appinstalled', () => {
    saved = null;
    tell();
  });
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', tell);
}

/** Opens the browser's own install dialog. Returns false when the browser has none to offer. */
export async function promptInstall(): Promise<boolean> {
  if (!saved) return false;
  const p = saved;
  saved = null;
  tell();
  await p.prompt();
  const choice = await p.userChoice?.catch(() => null);
  return choice?.outcome === 'accepted';
}

/** Re-renders when the app gets installed or the browser offers its install prompt. */
export function useInstallState() {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return { installed: isInstalled(), canPrompt: !!saved, browser: installBrowser };
}
