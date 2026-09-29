import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "@/components/empty-state";
import { GlassCard, GlassSheet } from "@/components/glass-sheet";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";

export default function Markets() {
  const [markets, setMarkets] = useState<any[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("markets")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setMarkets(data || []));
    supabase
      .from("settings")
      .select("home_banner_url")
      .eq("id", 1)
      .single()
      .then(({ data }) => setBanner(data?.home_banner_url || null));
  }, []);

  return (
    <View style={styles.root}>
      {/* Food / admin banner behind glass — same idea as reference car background */}
      <Image
        source={banner ? { uri: banner } : require("../../assets/welcome-food.jpg")}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <View style={styles.dim} />

      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Choose Your Market</Text>
          <Pressable onPress={() => router.push("/(customer)/menu")} style={styles.iconBtn}>
            <Ionicons name="person" size={20} color="#fff" />
          </Pressable>
        </View>

        <GlassSheet style={{ marginTop: 8 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {markets.length === 0 ? (
              <EmptyState icon="storefront" color={colors.customer} title="No markets yet" />
            ) : (
              markets.map((m) => (
                <Pressable key={m.id} onPress={() => router.push(`/(customer)/market/${m.id}`)}>
                  <GlassCard style={styles.row}>
                    <View style={styles.logo}>
                      {m.image_url ? (
                        <Image source={{ uri: m.image_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                      ) : (
                        <Ionicons name="storefront" size={26} color={colors.customerDeep} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{m.name}</Text>
                      {m.area ? <Text style={styles.meta}>{m.area}</Text> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                  </GlassCard>
                </Pressable>
              ))
            )}
          </ScrollView>
        </GlassSheet>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.28)" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontFamily: fonts.title, fontSize: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: fonts.title, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
});
