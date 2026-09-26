import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "@/components/ui";
import { BrandMark } from "@/components/brand";
import { colors, fonts } from "@/lib/theme";
import { currentProfile } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function Welcome() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 2500);

    currentProfile()
      .then(({ user, admin }) => {
        if (cancelled) return;
        if (admin) router.replace("/admin");
        else if (user) router.replace("/(customer)");
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

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.night }} />;

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.pills}>
          <Pill icon="restaurant" label="Good food" />
          <Pill icon="flame" label="Real flavours" />
          <Pill icon="heart" label="Traditional meals" />
          <Pill icon="bicycle" label="Delivered" />
        </View>
        <BrandMark size={42} />
        <Text style={styles.line}>One App.{"\n"}Two Ways to Serve You.</Text>
        {!isSupabaseConfigured ? (
          <Text style={styles.warn}>
            This APK was built without Supabase keys. Add EXPO_PUBLIC_SUPABASE_URL and
            EXPO_PUBLIC_SUPABASE_ANON_KEY to EAS Preview (plaintext or sensitive), then rebuild.
          </Text>
        ) : null}
      </View>
      <View style={styles.sheet}>
        <PrimaryButton
          label="I'm a Customer"
          color={colors.customer}
          textColor="#fff"
          onPress={() => router.push({ pathname: "/auth/phone", params: { mode: "customer" } })}
        />
        <View style={{ height: 12 }} />
        <PrimaryButton
          label="I'm a Rider"
          color={colors.rider}
          textColor="#fff"
          onPress={() => router.push({ pathname: "/auth/phone", params: { mode: "rider" } })}
        />
      </View>
    </View>
  );
}

function Pill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={12} color={colors.gold} />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.night },
  hero: {
    flex: 1,
    backgroundColor: colors.customerDeep,
    padding: 28,
    justifyContent: "flex-end",
    paddingBottom: 36,
  },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { color: "#F3E6C8", fontFamily: fonts.bodySemi, fontSize: 11 },
  line: {
    color: "#F3E6C8",
    marginTop: 14,
    fontSize: 18,
    lineHeight: 26,
    fontFamily: fonts.title,
  },
  warn: {
    color: colors.gold,
    marginTop: 16,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  sheet: { padding: 22, paddingBottom: 40, backgroundColor: colors.night },
});
