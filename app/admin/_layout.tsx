import { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { fonts, ui } from "@/lib/theme";
import { currentProfile } from "@/lib/session";

/** Admin has no bottom bar. The dashboard lists every section as a card; each section has a back arrow. */
export default function AdminLayout() {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    currentProfile().then(({ admin }) => {
      if (!admin) {
        router.replace("/(customer)");
        return;
      }
      setOk(true);
    });
  }, []);

  if (!ok) return <View style={{ flex: 1, backgroundColor: ui.bg }} />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: ui.bg },
          headerTintColor: ui.ink,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.title, fontSize: 17, color: ui.ink },
          headerBackTitleVisible: false,
          contentStyle: { backgroundColor: ui.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Admin" }} />
        <Stack.Screen name="orders" options={{ title: "Orders" }} />
        <Stack.Screen name="settings" options={{ title: "Home screen & fees" }} />
        <Stack.Screen name="markets" options={{ title: "Markets" }} />
        <Stack.Screen name="catalog" options={{ title: "Menu" }} />
        <Stack.Screen name="vendors" options={{ title: "Vendors" }} />
        <Stack.Screen name="riders" options={{ title: "Riders" }} />
      </Stack>
    </>
  );
}
