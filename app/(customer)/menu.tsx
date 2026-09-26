import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DarkScreen } from "@/components/app-shell";
import { BrandMark } from "@/components/brand";
import { currentProfile, signOutApp } from "@/lib/session";
import { colors, fonts } from "@/lib/theme";

type Row = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accent?: boolean;
};

export default function MenuDrawer() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [rider, setRider] = useState<any>(null);
  const [admin, setAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      currentProfile().then(({ user, profile, rider, admin }) => {
        setPhone(String(user?.phone || profile?.phone || ""));
        setName(profile?.full_name || "");
        setRider(rider);
        setAdmin(!!admin);
      });
    }, [])
  );

  const rows: Row[] = [
    { label: "Home", icon: "home-outline", onPress: () => router.push("/(customer)") },
    { label: "Markets", icon: "grid-outline", onPress: () => router.push("/(customer)/markets") },
    { label: "My Orders", icon: "receipt-outline", onPress: () => router.push("/(customer)/orders") },
    { label: "Account", icon: "person-outline", onPress: () => router.push("/(customer)/settings") },
  ];

  if (rider?.status === "APPROVED") {
    rows.push({
      label: "Rider mode",
      icon: "bicycle-outline",
      onPress: () => router.push("/(rider)"),
      accent: true,
    });
  } else if (rider?.status === "PENDING") {
    rows.push({
      label: "Rider application pending",
      icon: "time-outline",
      onPress: () => router.push("/auth/rider-apply"),
    });
  } else {
    rows.push({
      label: "Become a rider",
      icon: "bicycle-outline",
      onPress: () => router.push("/auth/rider-apply"),
      accent: true,
    });
  }

  if (admin) {
    rows.push({ label: "Admin", icon: "shield-outline", onPress: () => router.push("/admin") });
  }

  rows.push({
    label: "Log out",
    icon: "log-out-outline",
    onPress: async () => {
      await signOutApp();
      router.replace("/");
    },
  });

  return (
    <DarkScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 }}>
          <BrandMark size={36} align="left" />
          <Text style={{ color: "#B3B3B3", fontFamily: fonts.body, marginTop: 10 }}>
            {name || phone || "Signed in"}
          </Text>
        </View>
        {rows.map((row) => (
          <Pressable
            key={row.label}
            onPress={row.onPress}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.06)",
            }}
          >
            <Ionicons name={row.icon} size={20} color={row.accent ? colors.gold : "#fff"} />
            <Text
              style={{
                marginLeft: 14,
                color: row.accent ? colors.gold : "#fff",
                fontFamily: fonts.title,
                fontSize: 16,
                flex: 1,
              }}
            >
              {row.label}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </Pressable>
        ))}
      </ScrollView>
    </DarkScreen>
  );
}
