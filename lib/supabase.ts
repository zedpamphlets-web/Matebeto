import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const SUPABASE_URL = (
  extra.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  ""
).trim();

export const SUPABASE_ANON_KEY = (
  extra.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  ""
).trim();

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 20;

const authOptions = {
  storage: AsyncStorage,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
} as const;

function createSupabase(): SupabaseClient {
  // Empty url/key throws and kills the APK on open ("Matebeto keeps stopping").
  if (!isSupabaseConfigured) {
    return createClient("https://example.supabase.co", "public-anon-key", {
      auth: { ...authOptions, autoRefreshToken: false, persistSession: false },
    });
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: authOptions });
}

export const supabase = createSupabase();
