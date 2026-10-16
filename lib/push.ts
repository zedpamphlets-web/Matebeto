import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId() {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId || Constants.easConfig?.projectId || "";
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
    await supabase.rpc("register_push_token", { p_token: token.data, p_platform: Platform.OS });
  } catch {
    // A missing notification permission must not stop the app from opening.
  }
}

export function startPush() {
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
  return () => {
    auth.data.subscription.unsubscribe();
    opened.remove();
  };
}
