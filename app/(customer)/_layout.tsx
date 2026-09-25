import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

export default function CustomerTabs() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#128C3C" },
        headerTintColor: "#fff",
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "800" },
        tabBarActiveTintColor: "#128C3C",
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: colors.line, height: 62 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Matebeto", tabBarLabel: "Home", tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} /> }} />
      <Tabs.Screen name="orders" options={{ title: "My Orders", tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="basket" options={{ href: null, title: "Your Basket" }} />
      <Tabs.Screen name="markets" options={{ href: null, title: "Choose Your Market" }} />
      <Tabs.Screen name="market/[id]" options={{ href: null, title: "Categories" }} />
      <Tabs.Screen name="meal/[id]" options={{ href: null, title: "Meal" }} />
      <Tabs.Screen name="delivery" options={{ href: null, title: "Choose Delivery Type" }} />
      <Tabs.Screen name="checkout" options={{ href: null, title: "Payment Summary" }} />
    </Tabs>
  );
}
