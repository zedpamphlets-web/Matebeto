import { useCallback, useState } from "react";
import { Tabs, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";
import { loadBasket } from "@/lib/basket";

export default function CustomerTabs() {
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadBasket().then((b) => setCount(b.items.reduce((n, i) => n + i.quantity, 0)));
    }, [])
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: "#8A8A8A",
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: "#0B0B0B",
          borderTopColor: "rgba(255,255,255,0.08)",
          height: 64,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="basket"
        options={{
          title: "Basket",
          tabBarLabel: "Basket",
          tabBarBadge: count || undefined,
          tabBarBadgeStyle: { backgroundColor: colors.gold, color: colors.ink, fontFamily: fonts.bodySemi },
          tabBarIcon: ({ color }) => <Ionicons name="bag" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarLabel: "Menu",
          tabBarIcon: ({ color }) => <Ionicons name="menu" size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="markets" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="market/[id]" options={{ href: null }} />
      <Tabs.Screen name="meal/[id]" options={{ href: null }} />
      <Tabs.Screen name="delivery" options={{ href: null }} />
      <Tabs.Screen name="checkout" options={{ href: null }} />
    </Tabs>
  );
}
