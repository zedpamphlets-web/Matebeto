import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AccountDetails } from "@/lib/profile";

/**
 * The account lives on the phone too, so the greeting and the Profile screen can show the name at once
 * without waiting for Supabase. It is loaded once while the splash is showing, then read instantly.
 */
export const ACCOUNT_KEY = "matebeto.account.v1";
const FLAGS_KEY = "matebeto.flags.v1";

export type Flags = { rider: string | null; admin: boolean };

let account: AccountDetails | null = null;
let flags: Flags | null = null;
let hydrated = false;

export async function hydrateAccountCache() {
  if (hydrated) return;
  try {
    const [a, f] = await Promise.all([AsyncStorage.getItem(ACCOUNT_KEY), AsyncStorage.getItem(FLAGS_KEY)]);
    account = a ? JSON.parse(a) : null;
    flags = f ? JSON.parse(f) : null;
  } catch {
    // nothing saved yet
  }
  hydrated = true;
}

export const cachedAccount = () => account;
export const cachedFlags = () => flags;
export const cachedFirstName = () => String(account?.full_name || "").trim().split(/\s+/)[0] || "";

export function setCachedAccount(next: AccountDetails | null) {
  account = next;
}

export async function setCachedFlags(next: Flags) {
  flags = next;
  try {
    await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify(next));
  } catch {}
}

export async function clearAccountCache() {
  account = null;
  flags = null;
  hydrated = false;
  await AsyncStorage.removeItem(FLAGS_KEY).catch(() => {});
}
