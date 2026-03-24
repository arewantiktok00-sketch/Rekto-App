import 'react-native-url-polyfill/auto';
import type { Database } from '@/integrations/supabase/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from '@/lib/constants';
import { Platform } from 'react-native';

let Config: any = null;
try {
  // Optional dependency; use if installed
  const loaded = require('react-native-config');
  Config = loaded?.default ?? loaded;
} catch {
  Config = null;
}

const SUPABASE_URL =
  Config?.SUPABASE_URL ||
  Constants.expoConfig?.extra?.supabaseUrl ||
  Constants.expoConfig?.env?.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://uivgyexyakfincwgghgh.supabase.co';

const SUPABASE_ANON_KEY =
  Config?.SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  Constants.expoConfig?.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpdmd5ZXh5YWtmaW5jd2dnaGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTY4MDYsImV4cCI6MjA4MzI5MjgwNn0.Crz4L5Sbev3Jft6ou1SFz7htpWSWRxVaTaYgDE2DGso';

if (!SUPABASE_ANON_KEY) {
  console.error('Supabase anon key missing! Please set SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}
if (!SUPABASE_URL) {
  console.error('Supabase URL missing! Please set SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL.');
}

const isClient = Platform.OS !== 'web' || (typeof window !== 'undefined' && typeof document !== 'undefined');

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

if (isClient) {
  try {
    supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.error('[Supabase] Failed to initialize client:', error);
  }
}

export const supabase = supabaseInstance as ReturnType<typeof createClient<Database>>;
export const supabaseRead = supabase;

export async function safeQuery<T>(
  queryFn: (client: ReturnType<typeof createClient<Database>>) => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any; source: 'main' | 'mirror' }> {
  try {
    const result = await queryFn(supabase);
    return { ...result, source: 'main' };
  } catch (err) {
    return { data: null, error: err, source: 'main' };
  }
}
