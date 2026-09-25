import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { startRiderSearch, startVendorSearch } from "@/lib/orders";

export default function AdminOrders() {
  const [rows, setRows] = useState<any[]>([]);

  const load = () => supabase.from("orders").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data || []));
  useFocusEffect(useCallback(() => { load(); }, []));

  async function acceptVendor(id: string, yes: boolean) {
    const { error } = await supabase.rpc("respond_vendor", { p_order: id, p_accept: yes });
    if (error) Alert.alert("Vendor response", error.message);
    if (yes) await startRiderSearch(id);
    else await startVendorSearch(id);
    load();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {rows.map((o) => (
        <View key={o.id} style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 14, marginBottom: 10 }}>
          <Text style={{ fontWeight: "800" }}>#{o.order_number} · {formatKw(o.total)}</Text>
          <Text style={{ color: colors.muted }}>{o.status} · pay {o.payment_status}</Text>
          {o.status === "VENDOR_OFFERED" && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <Pressable onPress={() => acceptVendor(o.id, true)} style={chip}><Text>Vendor accept</Text></Pressable>
              <Pressable onPress={() => acceptVendor(o.id, false)} style={chip}><Text>Decline</Text></Pressable>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const chip = { backgroundColor: colors.cream, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 };
