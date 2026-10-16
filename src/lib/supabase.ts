import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** False until the owner fills in .env (see docs/setup.md). */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? 'https://not-configured.supabase.co', anonKey ?? 'not-configured', {
  auth: {
    // Web uses the browser's localStorage; native uses AsyncStorage.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});
