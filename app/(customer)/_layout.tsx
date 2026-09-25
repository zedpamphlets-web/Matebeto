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
        headerStyle: { backgroundColor: colors.customerDeep },
        headerTintColor: "#fff",
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.title },
        tabBarActiveTintColor: colors.customerDeep,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: colors.line, height: 64, paddingTop: 6 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Matebeto",
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="markets"
        options={{
          title: "Choose Your Market",
          tabBarLabel: "Markets",
          tabBarIcon: ({ color }) => <Ionicons name="grid" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="basket"
        options={{
          title: "Your Basket",
          tabBarLabel: "Basket",
          tabBarBadge: count || undefined,
          tabBarBadgeStyle: { backgroundColor: colors.gold, color: colors.ink, fontFamily: fonts.bodySemi },
          tabBarIcon: ({ color }) => <Ionicons name="bag" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "My Orders",
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="market/[id]" options={{ href: null, title: "Categories" }} />
      <Tabs.Screen name="meal/[id]" options={{ href: null, title: "Meal" }} />
      <Tabs.Screen name="delivery" options={{ href: null, title: "Choose Delivery Type" }} />
      <Tabs.Screen name="checkout" options={{ href: null, title: "Payment Summary" }} />
    </Tabs>
  );
}
