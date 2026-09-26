import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppHeader, DarkScreen } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";

export default function Orders() {
  const [rows, setRows] = useState<any[]>([]);
  const [tab, setTab] = useState<"current" | "past">("current");

  useFocusEffect(
    useCallback(() => {
      supabase.from("orders").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data || []));
    }, [])
  );

  const current = rows.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED");
  const past = rows.filter((o) => o.status === "COMPLETED" || o.status === "CANCELLED");
  const list = tab === "current" ? current : past;

  return (
    <DarkScreen>
      <AppHeader title="My Orders" onMenu={() => router.push("/(customer)/menu")} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: "row", backgroundColor: "#141414", borderRadius: 14, marginBottom: 14 }}>
          {(["current", "past"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{
                flex: 1,
                padding: 12,
                alignItems: "center",
                borderRadius: 14,
                backgroundColor: tab === t ? colors.gold : "transparent",
              }}
            >
              <Text
                style={{
                  color: tab === t ? colors.ink : "#fff",
                  fontFamily: fonts.title,
                  textTransform: "capitalize",
                }}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
        {list.length === 0 && (
          <Text style={{ color: "#8A8A8A", fontFamily: fonts.body }}>No {tab} orders.</Text>
        )}
        {list.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => router.push(`/order/${o.id}`)}
            style={{
              backgroundColor: "#141414",
              borderRadius: radius.md,
              padding: 16,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Text style={{ fontFamily: fonts.title, color: "#fff" }}>#{o.order_number}</Text>
            <Text style={{ color: "#8A8A8A", marginTop: 4, fontFamily: fonts.body, textTransform: "capitalize" }}>
              {o.delivery_type} · {friendlyStatus(o.status)}
            </Text>
            <Text style={{ marginTop: 6, fontFamily: fonts.display, color: colors.gold }}>{formatKw(o.total)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </DarkScreen>
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
