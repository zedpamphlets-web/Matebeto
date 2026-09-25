import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

export default function RiderTabs() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.cream },
      headerShadowVisible: false,
      headerTitleStyle: { fontWeight: "800" },
      tabBarActiveTintColor: colors.rider,
    }}>
      <Tabs.Screen name="index" options={{ title: "Jobs", tabBarIcon: ({ color }) => <Ionicons name="bicycle" size={22} color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: "Earnings", tabBarIcon: ({ color }) => <Ionicons name="wallet" size={22} color={color} /> }} />
      <Tabs.Screen name="job/[id]" options={{ href: null, title: "Job" }} />
    </Tabs>
  );
}
