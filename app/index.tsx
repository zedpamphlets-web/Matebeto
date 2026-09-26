import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand";
import { colors, fonts } from "@/lib/theme";
import { currentProfile } from "@/lib/session";

export default function Welcome() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 1800);

    currentProfile()
      .then(({ user, admin, rider, preview }) => {
        if (cancelled) return;
        if (admin) router.replace("/admin");
        else if (preview && rider) router.replace("/(rider)");
        else if (preview || user) router.replace("/(customer)");
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <Image source={require("../assets/splash.png")} style={StyleSheet.absoluteFillObject} contentFit="contain" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Image source={require("../assets/welcome-food.jpg")} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <LinearGradient
        colors={["rgba(0,0,0,0.78)", "rgba(0,0,0,0.42)", "rgba(0,0,0,0.12)", "rgba(0,0,0,0.55)"]}
        locations={[0, 0.28, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.copy}>
          <View style={styles.glass}>
            <BrandMark size={58} />
            <Text style={styles.one}>One App.</Text>
            <Text style={styles.two}>Two Ways to Serve You.</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <RoleButton
            color={colors.customer}
            icon="person"
            label="I'm a Customer"
            onPress={() => router.push({ pathname: "/auth/phone", params: { mode: "customer" } })}
          />
          <RoleButton
            color={colors.rider}
            icon="bicycle"
            label="I'm a Rider"
            onPress={() => router.push({ pathname: "/auth/phone", params: { mode: "rider" } })}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function RoleButton({
  color,
  icon,
  label,
  onPress,
}: {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.role, { backgroundColor: color }]}>
      <View style={styles.roleIcon}>
        <Ionicons name={icon} size={26} color="#fff" />
      </View>
      <Text style={styles.roleLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  safe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 22, paddingBottom: 28 },
  copy: { paddingTop: 36, alignItems: "center" },
  glass: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  one: {
    marginTop: 22,
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: -0.6,
    textAlign: "center",
  },
  two: {
    marginTop: 6,
    color: "#F4F4F4",
    fontFamily: fonts.bodySemi,
    fontSize: 18,
    textAlign: "center",
  },
  actions: { gap: 14, paddingBottom: 8 },
  role: {
    height: 64,
    borderRadius: 36,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    paddingRight: 18,
  },
  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  roleLabel: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontFamily: fonts.title,
    fontSize: 18,
    marginRight: 42,
  },
});
