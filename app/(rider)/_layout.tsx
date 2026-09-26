import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";

export default function RiderTabs() {
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
        options={{ title: "Jobs", tabBarIcon: ({ color }) => <Ionicons name="bicycle" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="earnings"
        options={{ title: "Earnings", tabBarIcon: ({ color }) => <Ionicons name="wallet" size={22} color={color} /> }}
      />
      <Tabs.Screen name="job/[id]" options={{ href: null, title: "Job" }} />
    </Tabs>
  );
}
