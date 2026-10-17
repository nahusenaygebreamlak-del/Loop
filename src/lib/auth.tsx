import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { signOutSync, startSync, stopSync } from '@/sync/engine';
import { isSupabaseConfigured, supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

type AuthState = {
  session: Session | null;
  /** Signed in for real, or in preview mode (no Supabase keys yet). */
  signedIn: boolean;
  /** Temporary: true when sign-in skipped Google because Supabase isn't set up. */
  preview: boolean;
  /** True until the stored session has been read. */
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));

    // Only refresh tokens while the app is in the foreground (Supabase guidance for RN).
    const appState =
      Platform.OS === 'web'
        ? null
        : AppState.addEventListener('change', (state) => {
            if (state === 'active') supabase.auth.startAutoRefresh();
            else supabase.auth.stopAutoRefresh();
          });

    return () => {
      sub.subscription.unsubscribe();
      appState?.remove();
    };
  }, []);

  // Sync runs while a real account is signed in (not in preview mode).
  const uid = session?.user.id;
  useEffect(() => {
    if (uid) void startSync(uid);
    else stopSync();
  }, [uid]);

  const value: AuthState = {
    session,
    signedIn: !!session || preview,
    preview,
    loading,
    signInWithGoogle: async () => {
      // Temporary until docs/setup.md is done: go straight to home without an account.
      if (!isSupabaseConfigured) {
        setPreview(true);
        return;
      }
      await signInWithGoogle();
    },
    signOut: async () => {
      if (preview) {
        setPreview(false);
        return;
      }
      await signOutSync();
      await supabase.auth.signOut();
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function signInWithGoogle() {
  if (!isSupabaseConfigured) throw new Error('not-configured');

  if (Platform.OS === 'web') {
    // Full-page redirect; the client picks the session up from the URL on return.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return;
  }

  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new Error('cancelled');

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('no-code');
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
