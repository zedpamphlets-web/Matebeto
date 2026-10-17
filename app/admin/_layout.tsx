import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { fonts, ui } from "@/lib/theme";
import { currentProfile } from "@/lib/session";
import { LoadingScreen } from "@/components/spinner";

/** Admin has no bottom bar. The dashboard lists every section as a card; each section has a back arrow. */
export default function AdminLayout() {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;
    const started = Date.now();
    currentProfile().then(async ({ admin }) => {
      // the spinner page shows for a moment so opening Admin never flashes
      const wait = Math.max(0, 700 - (Date.now() - started));
      if (wait) await new Promise((r) => setTimeout(r, wait));
      if (!alive) return;
      if (!admin) {
        router.replace("/(customer)");
        return;
      }
      setOk(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!ok) return <LoadingScreen />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTintColor: ui.ink,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.title, fontSize: 17, color: ui.ink },
          headerBackTitleVisible: false,
          contentStyle: { backgroundColor: "#FFFFFF" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Admin" }} />
        <Stack.Screen name="orders" options={{ title: "Orders" }} />
        <Stack.Screen name="settings" options={{ title: "Home screen" }} />
        <Stack.Screen name="markets" options={{ title: "Markets" }} />
        <Stack.Screen name="catalog" options={{ title: "Menu" }} />
        <Stack.Screen name="vendors" options={{ title: "Vendors" }} />
        <Stack.Screen name="riders" options={{ title: "Riders" }} />
      </Stack>
    </>
  );
}
