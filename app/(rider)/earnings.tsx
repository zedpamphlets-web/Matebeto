import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { currentProfile } from "@/lib/session";
import { LoadingBlock } from "@/components/spinner";
import { MkScreen } from "@/components/mk";
import { formatKw } from "@/lib/lipila";
import { fonts, ui } from "@/lib/theme";

export default function Earnings() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    currentProfile().then(async ({ rider }) => {
      if (!rider) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("rider_id", rider.id)
        .eq("status", "COMPLETED")
        .order("created_at", { ascending: false });
      setRows(data || []);
      setLoading(false);
    });
  }, []);

  const sum = rows.reduce((t, o) => t + Number(o.delivery_fee || 0), 0);

  return (
    <MkScreen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Earnings</Text>
        <View style={s.total}>
          <Text style={s.totalLabel}>Completed deliveries</Text>
          <Text style={s.totalValue}>{formatKw(sum)}</Text>
          <Text style={s.totalCount}>{rows.length} {rows.length === 1 ? "delivery" : "deliveries"}</Text>
        </View>
        {loading ? <LoadingBlock minHeight={200} /> : null}
        {rows.map((o) => (
          <View key={o.id} style={s.row}>
            <Text style={s.num}>Order #{o.order_number}</Text>
            <Text style={s.fee}>{formatKw(o.delivery_fee)}</Text>
          </View>
        ))}
      </ScrollView>
    </MkScreen>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 26, color: ui.ink, letterSpacing: -0.5, marginTop: 4 },
  total: { borderWidth: 1, borderColor: ui.line, borderRadius: 16, padding: 18, marginVertical: 16 },
  totalLabel: { fontFamily: fonts.body, fontSize: 14, color: ui.sub },
  totalValue: { fontFamily: fonts.display, fontSize: 34, color: ui.ink, marginTop: 4 },
  totalCount: { fontFamily: fonts.body, fontSize: 13.5, color: ui.sub, marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: ui.line },
  num: { fontFamily: fonts.title, fontSize: 15.5, color: ui.ink },
  fee: { fontFamily: fonts.title, fontSize: 15.5, color: ui.ink },
});
