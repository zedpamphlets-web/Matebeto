import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { fonts, ui } from "@/lib/theme";

export default function RiderTabs() {
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: ui.red,
          tabBarInactiveTintColor: ui.sub,
          tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 12 },
          sceneStyle: { backgroundColor: "#FFFFFF" },
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: ui.line,
            height: 66,
            paddingTop: 8,
            paddingBottom: 8,
            elevation: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: "Jobs", tabBarIcon: ({ color }) => <Ionicons name="bicycle" size={24} color={color} /> }}
        />
        <Tabs.Screen
          name="earnings"
          options={{ title: "Earnings", tabBarIcon: ({ color }) => <Ionicons name="wallet-outline" size={24} color={color} /> }}
        />
        <Tabs.Screen name="job/[id]" options={{ href: null, title: "Job", tabBarStyle: { display: "none" } }} />
      </Tabs>
    </>
  );
}
