import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/empty-state";
import { LoadingBlock } from "@/components/spinner";
import { OfflineNotice } from "@/components/offline-notice";
import { OfflineBanner } from "@/components/offline-banner";
import { MkScreen } from "@/components/mk";
import { supabase } from "@/lib/supabase";
import { fonts, ui } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { useCachedLoad } from "@/lib/offline-cache";

export default function Orders() {
  const [tab, setTab] = useState<"current" | "past">("current");

  const q = useCachedLoad<any[]>("orders.mine", () =>
    supabase.from("orders").select("*").order("created_at", { ascending: false })
  );
  const rows = q.data || [];

  const current = rows.filter(
    (o) => !["COMPLETED", "CANCELLED", "NO_VENDOR_FOUND", "NO_RIDER_AVAILABLE"].includes(o.status) && o.payment_status !== "unpaid"
  );
  const past = rows.filter((o) => o.status === "COMPLETED" || o.status === "CANCELLED");
  const list = tab === "current" ? current : past;

  return (
    <MkScreen>
      <Text style={s.title}>My orders</Text>
      <View style={s.tabs}>
        {(["current", "past"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]}>
            <Text style={[s.tabText, tab === t && s.tabTextOn]}>{t === "current" ? "Current" : "Past"}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {q.stale ? <OfflineBanner /> : null}
        {q.failed ? (
          <OfflineNotice onRetry={q.reload} />
        ) : q.loading ? (
          <LoadingBlock minHeight={360} />
        ) : list.length === 0 ? (
          <EmptyState icon="receipt" color={ui.red} title="No orders" />
        ) : (
          list.map((o) => (
            <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}`)} style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.num}>Order #{o.order_number}</Text>
                <Text style={s.meta}>
                  {o.delivery_type} · {friendlyStatus(o.status)}
                </Text>
              </View>
              <Text style={s.total}>{formatKw(o.total)}</Text>
              <Ionicons name="chevron-forward" size={16} color={ui.hint} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </MkScreen>
  );
}

function friendlyStatus(status: string) {
  if (status === "COMPLETED") return "Completed";
  if (status === "OUT_FOR_DELIVERY") return "On the way";
  if (status === "VENDOR_ACCEPTED") return "Preparing";
  if (status === "NO_VENDOR_FOUND") return "No vendor found";
  if (status === "NO_RIDER_AVAILABLE") return "Waiting for a rider";
  const t = status.replaceAll("_", " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const s = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 26, color: ui.ink, paddingHorizontal: 16, paddingTop: 10, letterSpacing: -0.5 },
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  tab: { paddingHorizontal: 18, height: 38, borderRadius: 19, backgroundColor: "#F5F5F7", alignItems: "center", justifyContent: "center" },
  tabOn: { backgroundColor: ui.red },
  tabText: { fontFamily: fonts.title, fontSize: 14, color: ui.ink },
  tabTextOn: { color: "#fff" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: 14,
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 10,
  },
  num: { fontFamily: fonts.title, fontSize: 16, color: ui.ink },
  meta: { fontFamily: fonts.body, fontSize: 13.5, color: ui.sub, marginTop: 3, textTransform: "capitalize" },
  total: { fontFamily: fonts.title, fontSize: 15, color: ui.ink },
});
