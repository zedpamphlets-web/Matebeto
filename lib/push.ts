import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Missing notification support must not stop the app from opening.
}

function projectId() {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId || Constants.easConfig?.projectId || "";
}

function deviceLabel() {
  try {
    if (Platform.OS !== "android") return "";
    const c = (Platform.constants || {}) as { Brand?: string; Model?: string };
    const brand = String(c.Brand || "").trim();
    const model = String(c.Model || "").trim();
    if (!model) return brand;
    if (!brand || model.toLowerCase().startsWith(brand.toLowerCase())) return model;
    return `${brand} ${model}`;
  } catch {
    return "";
  }
}

/** Tells the server a new account exists, so admins hear which phone signed up. Does nothing for old accounts. */
let announcedFor = "";
async function announceAccount() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid || announcedFor === uid) return;
    announcedFor = uid; // once per app launch is enough; the server also ignores repeats
    const { error } = await supabase.rpc("announce_new_account", {
      p_device: deviceLabel(),
      p_platform: Platform.OS,
    });
    if (error) {
      announcedFor = "";
      console.warn("[push] could not announce account:", error.message);
    }
  } catch (e: any) {
    announcedFor = "";
    console.warn("[push] announce failed:", e?.message || e);
  }
}

export function openFromPush(data?: Record<string, unknown>) {
  const path = typeof data?.path === "string" ? data.path : "";
  if (!path.startsWith("/")) return;
  router.push(path as never);
}

/** Saves this phone with the signed-in account so the server can notify it after the app is closed. */
export async function registerPush() {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("orders", {
        name: "Orders",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) return;

    const id = projectId();
    if (!id) return;
    const token = await Notifications.getExpoPushTokenAsync({ projectId: id });
    if (!token.data) return;
    const { error } = await supabase.rpc("register_push_token", { p_token: token.data, p_platform: Platform.OS });
    if (error) console.warn("[push] could not save token:", error.message);
  } catch (e: any) {
    // Never stop the app from opening, but leave a trace for debugging.
    console.warn("[push] registration failed:", e?.message || e);
  } finally {
    // runs even when notifications were declined, so admins still hear about the new account
    announceAccount();
  }
}

export function startPush() {
  try {
    registerPush();
    const auth = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") registerPush();
    });
    const opened = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromPush(response.notification.request.content.data as Record<string, unknown>);
    });
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) openFromPush(response.notification.request.content.data as Record<string, unknown>);
      })
      .catch(() => {});
    // Re-save the token whenever the app comes back to the front (it can change or be cleared).
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") registerPush();
    });
    return () => {
      auth.data.subscription.unsubscribe();
      opened.remove();
      appState.remove();
    };
  } catch {
    return () => {};
  }
}
