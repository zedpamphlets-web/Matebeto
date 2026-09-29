import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const SUPABASE_URL = (
  extra.supabaseUrl ||
  extra.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  ""
).trim();

export const SUPABASE_ANON_KEY = (
  extra.supabaseAnonKey ||
  extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  extra.supabasePublishableKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
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

async function mobileFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type") && !headers.has("content-type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}

function createSupabase(): SupabaseClient {
  // Empty url/key throws and kills the APK on open ("Matebeto keeps stopping").
  if (!isSupabaseConfigured) {
    return createClient("https://example.supabase.co", "public-anon-key", {
      auth: { ...authOptions, autoRefreshToken: false, persistSession: false },
    });
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: authOptions,
    global: { fetch: mobileFetch },
  });
}

export const supabase = createSupabase();

if (Platform.OS !== "web" && isSupabaseConfigured) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export function friendlyAuthError(raw?: string | null) {
  const message = String(raw || "").trim();
  const lower = message.toLowerCase();
  if (!message || lower.includes("network request failed") || lower.includes("failed to fetch")) {
    return "Cannot reach the Matebeto server. Check mobile data / Wi‑Fi, confirm the Supabase project is running (not paused), then try again.";
  }
  if (lower.includes("unsupported phone") || lower.includes("phone signups are disabled")) {
    return "Phone login is not enabled on the Supabase project yet. Turn on Authentication → Providers → Phone.";
  }
  if (lower.includes("error sending") || lower.includes("sms") || lower.includes("hook")) {
    return message + " Check Africa's Talking secrets and the Send SMS hook.";
  }
  return message;
}

export async function pingSupabase() {
  if (!isSupabaseConfigured) return { ok: false, detail: "Supabase keys are missing from this build." };
  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/health`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    if (!res.ok) return { ok: false, detail: `Server answered ${res.status}.` };
    return { ok: true, detail: "connected" };
  } catch (e: any) {
    return { ok: false, detail: e?.message || "Network request failed" };
  }
}
