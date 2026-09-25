import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { startRiderSearch, startVendorSearch } from "@/lib/orders";

export default function AdminOrders() {
  const [rows, setRows] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const [{ data: o }, { data: i }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("order_items").select("*"),
    ]);
    setRows(o || []);
    setItems(i || []);
  };
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function acceptVendor(id: string, yes: boolean) {
    const { error } = await supabase.rpc("respond_vendor", { p_order: id, p_accept: yes });
    if (error) Alert.alert("Vendor response", error.message);
    if (yes) await startRiderSearch(id);
    else await startVendorSearch(id);
    load();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ color: colors.muted, fontFamily: fonts.body, marginBottom: 12 }}>
        Live orders only. Accept/decline here until WhatsApp is connected. Payment and delivery still come from Lipila and the customer OTP.
      </Text>
      {rows.length === 0 && <Text style={{ color: colors.muted, fontFamily: fonts.body }}>No orders yet.</Text>}
      {rows.map((o) => (
        <View key={o.id} style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 14, marginBottom: 10 }}>
          <Text style={{ fontFamily: fonts.title }}>
            #{o.order_number} · {formatKw(o.total)}
          </Text>
          <Text style={{ color: colors.muted, fontFamily: fonts.body }}>
            {o.status.replaceAll("_", " ")} · pay {o.payment_status} · {o.delivery_type}
          </Text>
          {items
            .filter((i) => i.order_id === o.id)
            .map((i) => (
              <Text key={i.id} style={{ fontFamily: fonts.body, marginTop: 2 }}>
                {i.quantity} × {i.meal_name}
              </Text>
            ))}
          {o.status === "VENDOR_OFFERED" && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <Pressable onPress={() => acceptVendor(o.id, true)} style={chip}>
                <Text style={{ fontFamily: fonts.bodySemi }}>Vendor accept</Text>
              </Pressable>
              <Pressable onPress={() => acceptVendor(o.id, false)} style={chip}>
                <Text style={{ fontFamily: fonts.bodySemi }}>Decline</Text>
              </Pressable>
            </View>
          )}
          {["VENDOR_ACCEPTED", "SEARCHING_RIDER", "NO_RIDER_AVAILABLE"].includes(o.status) && (
            <Pressable onPress={() => startRiderSearch(o.id).then(load)} style={[chip, { marginTop: 10 }]}>
              <Text style={{ fontFamily: fonts.bodySemi }}>Find rider</Text>
            </Pressable>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const chip = {
  backgroundColor: colors.gold,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 10,
};
