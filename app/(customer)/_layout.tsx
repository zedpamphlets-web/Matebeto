import { useCallback, useState } from "react";
import { Tabs, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts, ui } from "@/lib/theme";
import { loadBasket } from "@/lib/basket";

const TAB_BAR_STYLE = {
  backgroundColor: "#FFFFFF",
  borderTopWidth: 1,
  borderTopColor: "#EBEBEF",
  height: 66,
  paddingTop: 8,
  paddingBottom: 8,
  elevation: 0,
  shadowOpacity: 0,
};

const HIDDEN_TAB_BAR = { display: "none" as const };

function TabIcon({
  name,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return <Ionicons name={name} size={24} color={color} />;
}

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
        tabBarActiveTintColor: ui.red,
        tabBarInactiveTintColor: ui.sub,
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 12, marginTop: 2 },
        tabBarStyle: TAB_BAR_STYLE,
        sceneStyle: { backgroundColor: ui.bg },
      }}
    >
      {/* Bottom bar: Home, Orders, Basket, Profile */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "clipboard" : "clipboard-outline"} color={color} />
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
            backgroundColor: ui.red,
            color: "#fff",
            fontFamily: fonts.bodySemi,
          },
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "bag-handle" : "bag-handle-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} color={color} />
          ),
        }}
      />

      {/* Secondary screens: no tab icon. Markets, Account, Notifications and the Basket keep the bottom bar; the rest hide it. */}
      <Tabs.Screen name="markets" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="market/[id]" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="meal/[id]" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="delivery" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="checkout" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
