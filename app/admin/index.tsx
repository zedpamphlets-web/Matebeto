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
    <ScrollView style={{ flex: 1, backgroundColor: colors.adminBg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {rows.length === 0 && <Text style={{ color: colors.adminMuted, fontFamily: fonts.body }}>No orders yet.</Text>}
      {rows.map((o) => (
        <View key={o.id} style={{ backgroundColor: colors.adminCard, borderWidth: 1, borderColor: colors.adminCardBorder, borderRadius: radius.md, padding: 14, marginBottom: 10 }}>
          <Text style={{ fontFamily: fonts.title, color: colors.adminText }}>
            #{o.order_number} · {formatKw(o.total)}
          </Text>
          <Text style={{ color: colors.adminMuted, fontFamily: fonts.body }}>
            {o.status.replaceAll("_", " ")} · pay {o.payment_status} · {o.delivery_type}
          </Text>
          {items
            .filter((i) => i.order_id === o.id)
            .map((i) => (
              <Text key={i.id} style={{ fontFamily: fonts.body, marginTop: 2 }}>
                {i.quantity} × {i.meal_name}
              </Text>
            ))}
          {["SUPPORT_REQUIRED", "CUSTOMER_NOT_HOME", "NO_VENDOR_FOUND", "NO_RIDER_AVAILABLE", "CANCELLED"].includes(o.status) && (
            <Text style={{ color: colors.danger || "#c00", fontFamily: fonts.bodySemi, marginTop: 6 }}>
              Needs attention
            </Text>
          )}
          {o.status === "SUPPORT_REQUIRED" && (
            <Pressable
              onPress={async () => {
                const { error } = await supabase.rpc("reset_delivery_lock", { p_order: o.id });
                if (error) Alert.alert("Reset", error.message);
                load();
              }}
              style={[chip, { marginTop: 10 }]}
            >
              <Text style={{ fontFamily: fonts.bodySemi }}>Reset OTP lock</Text>
            </Pressable>
          )}
          {["VENDOR_ACCEPTED", "VENDOR_OFFERED"].includes(o.status) && (
            <Pressable
              onPress={async () => {
                const { error } = await supabase.rpc("vendor_cannot_fulfil", { p_order: o.id });
                if (error) Alert.alert("Vendor", error.message);
                load();
              }}
              style={[chip, { marginTop: 10 }]}
            >
              <Text style={{ fontFamily: fonts.bodySemi }}>Vendor cannot fulfil</Text>
            </Pressable>
          )}
          {o.rider_id && (
            <Pressable
              onPress={async () => {
                const { error } = await supabase.rpc("rider_cannot_finish", { p_order: o.id });
                if (error) Alert.alert("Rider", error.message);
                load();
              }}
              style={[chip, { marginTop: 10 }]}
            >
              <Text style={{ fontFamily: fonts.bodySemi }}>Reassign rider</Text>
            </Pressable>
          )}
          {o.payment_status === "refund_pending" && (
            <Pressable
              onPress={async () => {
                const { error } = await supabase.from("orders").update({ payment_status: "refunded" }).eq("id", o.id);
                if (error) Alert.alert("Refund", error.message);
                else load();
              }}
              style={[chip, { marginTop: 10 }]}
            >
              <Text style={{ fontFamily: fonts.bodySemi }}>Mark refund done</Text>
            </Pressable>
          )}
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
