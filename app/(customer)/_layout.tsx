import { useCallback, useState } from "react";
import { View } from "react-native";
import { Tabs, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";
import { loadBasket } from "@/lib/basket";

const TAB_BAR_STYLE = {
  position: "absolute" as const,
  left: 12,
  right: 12,
  bottom: 10,
  height: 72,
  paddingTop: 8,
  paddingBottom: 8,
  borderRadius: 24,
  backgroundColor: "rgba(255,255,255,0.92)",
  borderTopWidth: 0,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.75)",
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 12,
};

const HIDDEN_TAB_BAR = { display: "none" as const };

function TabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}) {
  return (
    <View
      style={{
        width: 46,
        height: 46,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? "rgba(244,163,0,0.18)" : "rgba(255,255,255,0.55)",
        borderWidth: 1,
        borderColor: focused ? "rgba(244,163,0,0.45)" : "rgba(255,255,255,0.7)",
      }}
    >
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
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
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: "#6B6B6B",
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11, marginTop: 2 },
        tabBarStyle: TAB_BAR_STYLE,
      }}
    >
      {/* Only these three appear in the bottom bar */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} focused={focused} color={color} />
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
            <TabIcon name={focused ? "basket" : "basket-outline"} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "receipt" : "receipt-outline"} focused={focused} color={color} />
          ),
        }}
      />

      {/* Secondary screens: no tab icon + hide bottom bar */}
      <Tabs.Screen name="menu" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="markets" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="settings" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="market/[id]" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="meal/[id]" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="delivery" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
      <Tabs.Screen name="checkout" options={{ href: null, tabBarStyle: HIDDEN_TAB_BAR }} />
    </Tabs>
  );
}
