import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { currentProfile } from "@/lib/session";
import { colors, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";

export default function Earnings() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    currentProfile().then(async ({ rider }) => {
      if (!rider) return;
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("rider_id", rider.id)
        .eq("status", "COMPLETED")
        .order("created_at", { ascending: false });
      setRows(data || []);
    });
  }, []);

  const sum = rows.reduce((s, o) => s + Number(o.delivery_fee || 0), 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 26, fontWeight: "800" }}>Earnings</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>Completed deliveries · fee shown is the delivery fee</Text>
      <View style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 16, marginVertical: 16 }}>
        <Text style={{ color: colors.muted }}>Completed total</Text>
        <Text style={{ fontSize: 28, fontWeight: "800" }}>{formatKw(sum)}</Text>
      </View>
      {rows.map((o) => (
        <View key={o.id} style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 14, marginBottom: 8 }}>
          <Text style={{ fontWeight: "800" }}>#{o.order_number}</Text>
          <Text>{formatKw(o.delivery_fee)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
