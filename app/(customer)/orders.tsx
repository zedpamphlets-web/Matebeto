import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { EmptyState } from "@/components/empty-state";
import { AppHeader } from "@/components/app-shell";
import { GlassSheet } from "@/components/glass-sheet";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Orders() {
  const [rows, setRows] = useState<any[]>([]);
  const [tab, setTab] = useState<"current" | "past">("current");

  useFocusEffect(
    useCallback(() => {
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => setRows(data || []));
    }, [])
  );

  const current = rows.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED");
  const past = rows.filter((o) => o.status === "COMPLETED" || o.status === "CANCELLED");
  const list = tab === "current" ? current : past;

  return (
    <View style={styles.root}>
      <Image
        source={require("../../assets/welcome-food.jpg")}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <View style={styles.dim} />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <AppHeader title="My Orders" onMenu={() => router.push("/(customer)/menu")} />
        <GlassSheet style={{ marginTop: 4 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            <View style={styles.tabs}>
              {(["current", "past"] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={[styles.tab, tab === t && styles.tabOn]}
                >
                  <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
                    {t === "current" ? "Current" : "Past"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {list.length === 0 ? (
              <EmptyState icon="wallet" color={colors.customer} title="No orders" />
            ) : (
              list.map((o) => (
                <Pressable
                  key={o.id}
                  onPress={() => router.push(`/order/${o.id}`)}
                  style={styles.card}
                >
                  <Text style={{ fontFamily: fonts.title }}>#{o.order_number}</Text>
                  <Text
                    style={{
                      color: colors.muted,
                      marginTop: 4,
                      fontFamily: fonts.body,
                      textTransform: "capitalize",
                    }}
                  >
                    {o.delivery_type} · {friendlyStatus(o.status)}
                  </Text>
                  <Text style={{ marginTop: 6, fontFamily: fonts.display }}>{formatKw(o.total)}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </GlassSheet>
      </SafeAreaView>
    </View>
  );
}

function friendlyStatus(status: string) {
  if (status === "COMPLETED") return "Completed";
  if (status === "OUT_FOR_DELIVERY") return "On the way";
  if (status === "VENDOR_ACCEPTED") return "Preparing";
  if (status === "NO_VENDOR_FOUND") return "No vendor found";
  if (status === "NO_RIDER_AVAILABLE") return "Waiting for a rider";
  return status.replaceAll("_", " ").toLowerCase();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
  },
  tab: { flex: 1, padding: 12, alignItems: "center", borderRadius: 14 },
  tabOn: { backgroundColor: colors.ink },
  tabText: { color: colors.ink, fontFamily: fonts.title, textTransform: "capitalize" },
  tabTextOn: { color: "#fff" },
  card: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
});
