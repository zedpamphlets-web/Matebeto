import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/lib/theme";
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
    <ScrollView style={{ flex: 1, backgroundColor: "#F4F6F3" }} contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, marginBottom: 14 }}>
        {(["current", "past"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1,
              padding: 12,
              alignItems: "center",
              borderRadius: 14,
              backgroundColor: tab === t ? colors.ink : "transparent",
            }}
          >
            <Text style={{ color: tab === t ? "#fff" : colors.ink, fontWeight: "800", textTransform: "capitalize" }}>{t}</Text>
          </Pressable>
        ))}
      </View>
      {list.length === 0 && <Text style={{ color: colors.muted }}>No {tab} orders.</Text>}
      {list.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => router.push(`/order/${o.id}`)}
          style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 16, marginBottom: 10 }}
        >
          <Text style={{ fontWeight: "800" }}>#{o.order_number}</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{o.status.replaceAll("_", " ")}</Text>
          <Text style={{ marginTop: 6, fontWeight: "800" }}>{formatKw(o.total)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
