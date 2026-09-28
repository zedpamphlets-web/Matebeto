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
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: colors.line,
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="basket"
        options={{
          title: "Basket",
          tabBarLabel: "Basket",
          tabBarBadge: count || undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.gold,
            color: colors.ink,
            fontFamily: fonts.bodySemi,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "basket" : "basket-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "wallet" : "wallet-outline"} size={22} color={color} />
          ),
        }}
      />
      {/* Menu lives in top profile avatar — not in bottom bar */}
      <Tabs.Screen name="menu" options={{ href: null }} />
      <Tabs.Screen name="markets" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="market/[id]" options={{ href: null }} />
      <Tabs.Screen name="meal/[id]" options={{ href: null }} />
      <Tabs.Screen name="delivery" options={{ href: null }} />
      <Tabs.Screen name="checkout" options={{ href: null }} />
    </Tabs>
  );
}
