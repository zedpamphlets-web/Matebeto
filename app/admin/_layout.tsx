import { useEffect, useState } from "react";
import { View } from "react-native";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";
import { currentProfile } from "@/lib/session";

export default function AdminTabs() {
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

  if (!ok) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.gold,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.title },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Orders", tabBarIcon: ({ color }) => <Ionicons name="list" size={22} color={color} /> }} />
      <Tabs.Screen name="markets" options={{ title: "Markets", tabBarIcon: ({ color }) => <Ionicons name="map" size={22} color={color} /> }} />
      <Tabs.Screen name="catalog" options={{ title: "Menu", tabBarIcon: ({ color }) => <Ionicons name="restaurant" size={22} color={color} /> }} />
      <Tabs.Screen name="vendors" options={{ title: "Vendors", tabBarIcon: ({ color }) => <Ionicons name="storefront" size={22} color={color} /> }} />
      <Tabs.Screen name="riders" options={{ title: "Riders", tabBarIcon: ({ color }) => <Ionicons name="bicycle" size={22} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Fees", tabBarIcon: ({ color }) => <Ionicons name="settings" size={22} color={color} /> }} />
    </Tabs>
  );
}
