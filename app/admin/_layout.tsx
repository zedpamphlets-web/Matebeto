import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

export default function AdminTabs() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.cream },
      headerShadowVisible: false,
      headerTitleStyle: { fontWeight: "800" },
      tabBarActiveTintColor: colors.ink,
    }}>
      <Tabs.Screen name="index" options={{ title: "Orders", tabBarIcon: ({ color }) => <Ionicons name="list" size={22} color={color} /> }} />
      <Tabs.Screen name="vendors" options={{ title: "Vendors", tabBarIcon: ({ color }) => <Ionicons name="storefront" size={22} color={color} /> }} />
      <Tabs.Screen name="catalog" options={{ title: "Menu", tabBarIcon: ({ color }) => <Ionicons name="restaurant" size={22} color={color} /> }} />
      <Tabs.Screen name="riders" options={{ title: "Riders", tabBarIcon: ({ color }) => <Ionicons name="bicycle" size={22} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Fees", tabBarIcon: ({ color }) => <Ionicons name="settings" size={22} color={color} /> }} />
    </Tabs>
  );
}
