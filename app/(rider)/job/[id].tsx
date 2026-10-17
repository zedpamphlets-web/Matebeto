import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { fonts, ui } from "@/lib/theme";
import { Field } from "@/components/ui";
import { LoadingScreen } from "@/components/spinner";
import { MkHeader, MkScreen, RedButton, goBack } from "@/components/mk";
import { OfflineNotice } from "@/components/offline-notice";
import { formatKw } from "@/lib/lipila";
import { startRiderSearch } from "@/lib/orders";

/**
 * Rider delivery, exactly as the client described it:
 *   1. Compare the order number with the vendor's order, then tap "Collected".
 *   2. Call the customer.
 *   3. When the food is handed over, enter the customer's OTP. That completes the delivery.
 * No other steps and no other buttons.
 */
export default function Job() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [vendor, setVendor] = useState<any>(null);
  const [otp, setOtp] = useState("");
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    const { data: o, error } = await supabase.from("orders").select("*").eq("id", id).single();
    if (error || !o) {
      setFailed(true);
      return;
    }
    setOrder(o);
    const { data: its } = await supabase.from("order_items").select("*").eq("order_id", id);
    setItems(its || []);
    if (o?.vendor_id) {
      const { data: name } = await supabase.rpc("order_vendor_name", { p_order: id });
      setVendor({ name: name || "Vendor" });
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function accept(yes: boolean) {
    const { error } = await supabase.rpc("rider_respond", { p_order: id, p_accept: yes });
    if (error) return Alert.alert("Could not respond", error.message);
    if (!yes) {
      await startRiderSearch(String(id)).catch(() => null);
      router.back();
      return;
    }
    await load();
  }

  async function collected() {
    const { error } = await supabase.rpc("confirm_pickup", { p_order: id });
    if (error) return Alert.alert("Could not mark collected", error.message);
    await load();
  }

  async function callCustomer() {
    const { data, error } = await supabase.rpc("rider_customer_phone", { p_order: id });
    const number = String(data || "").trim();
    if (error || !number) {
      return Alert.alert("No number found", "We could not get the customer's number. Check your connection and try again.");
    }
    const url = `tel:${number.replace(/[^\d+]/g, "")}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (!ok) return Alert.alert("Call the customer", number);
    await Linking.openURL(url);
  }

  async function complete() {
    const code = otp.replace(/\D/g, "");
    if (code.length < 4) {
      return Alert.alert("Enter the code", "Ask the customer for their delivery code.");
    }
    const { data, error } = await supabase.rpc("verify_delivery_otp", { p_order: id, p_code: code });
    if (error) return Alert.alert("Could not check the code", error.message);
    if (!data?.ok) {
      if (data?.reason === "LOCKED_AFTER_5" || data?.reason === "LOCKED") {
        Alert.alert("Too many wrong codes", "This delivery is locked. Matebeto support has been told and will contact you.");
        await load();
        return;
      }
      const left = typeof data?.attempts_left === "number" ? ` You have ${data.attempts_left} tries left.` : "";
      return Alert.alert("Wrong code", `Ask the customer again.${left}`);
    }
    Alert.alert("Delivered", `Order #${order.order_number} is complete.`);
    router.replace("/(rider)");
  }

  if (failed) {
    return (
      <MkScreen>
        <MkHeader title="Delivery" onBack={() => goBack("/(rider)")} />
        <OfflineNotice onRetry={load} />
      </MkScreen>
    );
  }
  if (!order) {
    return (
      <MkScreen>
        <MkHeader title="Delivery" onBack={() => goBack("/(rider)")} />
        <LoadingScreen />
      </MkScreen>
    );
  }

  const offered = order.status === "SEARCHING_RIDER" && !order.rider_id;
  const toCollect = order.status === "RIDER_ASSIGNED";
  const delivering = ["PICKED_UP", "OUT_FOR_DELIVERY", "CUSTOMER_NOT_HOME"].includes(order.status);

  return (
    <MkScreen>
      <MkHeader title="Delivery" onBack={() => goBack("/(rider)")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={s.numberCard}>
          <Text style={s.numberLabel}>Order number</Text>
          <Text style={s.number}>#{order.order_number}</Text>
        </View>

        <View style={s.card}>
          <Row icon="storefront-outline" title="Collect from" value={vendor?.name || "Vendor"} />
          <Row icon="location-outline" title="Deliver to" value={order.delivery_address?.text || "Customer address"} />
          <Row icon="bicycle" title="Delivery" value={order.delivery_type} last />
        </View>

        <View style={[s.card, { marginTop: 12 }]}>
          <Text style={s.cardTitle}>Items</Text>
          {items.map((it) => (
            <View key={it.id} style={s.itemRow}>
              <Text style={s.itemQty}>{it.quantity}×</Text>
              <Text style={s.itemName}>{it.meal_name}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>{formatKw(order.total)}</Text>
          </View>
        </View>

        <View style={{ height: 18 }} />

        {offered && (
          <>
            <RedButton label="Accept" onPress={() => accept(true)} />
            <Pressable onPress={() => accept(false)} style={s.decline}>
              <Text style={s.declineText}>Decline</Text>
            </Pressable>
          </>
        )}

        {toCollect && (
          <>
            <Text style={s.hint}>At the vendor, check that their order number is #{order.order_number}. Then tap Collected.</Text>
            <RedButton label={`Collected · #${order.order_number}`} onPress={collected} />
          </>
        )}

        {delivering && (
          <>
            <Text style={s.step}>Call the customer</Text>
            <RedButton label="Call customer" icon="call" onPress={callCustomer} />

            <Text style={[s.step, { marginTop: 24 }]}>Enter the customer's code</Text>
            <Text style={s.hint}>When you hand over the food, the customer gives you their code.</Text>
            <Field value={otp} onChangeText={(t) => setOtp(t.replace(/\D/g, ""))} placeholder="Customer code" keyboardType="number-pad" />
            <View style={{ height: 12 }} />
            <RedButton label="Complete delivery" onPress={complete} />
          </>
        )}

        {order.status === "SUPPORT_REQUIRED" && (
          <View style={[s.card, { marginTop: 8 }]}>
            <Text style={s.hint}>Matebeto support is looking at this delivery. Wait for their call.</Text>
          </View>
        )}
      </ScrollView>
    </MkScreen>
  );
}

function Row({ icon, title, value, last }: { icon: keyof typeof Ionicons.glyphMap; title: string; value: string; last?: boolean }) {
  return (
    <View style={[s.row, !last && s.rowRule]}>
      <Ionicons name={icon} size={20} color={ui.red} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  numberCard: { borderWidth: 1, borderColor: ui.line, borderRadius: 16, padding: 18, marginBottom: 12 },
  numberLabel: { fontFamily: fonts.body, fontSize: 14, color: ui.sub },
  number: { fontFamily: fonts.display, fontSize: 36, color: ui.ink, marginTop: 2 },
  card: { borderWidth: 1, borderColor: ui.line, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: "#fff" },
  cardTitle: { fontFamily: fonts.title, fontSize: 15, color: ui.ink, paddingTop: 12, paddingBottom: 4 },
  row: { flexDirection: "row", gap: 12, paddingVertical: 14 },
  rowRule: { borderBottomWidth: 1, borderBottomColor: ui.line },
  rowTitle: { fontFamily: fonts.body, fontSize: 13, color: ui.sub },
  rowValue: { fontFamily: fonts.bodySemi, fontSize: 15.5, color: ui.ink, marginTop: 2, textTransform: "capitalize" },
  itemRow: { flexDirection: "row", gap: 8, paddingVertical: 5 },
  itemQty: { fontFamily: fonts.title, fontSize: 15, color: ui.ink, minWidth: 28 },
  itemName: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: ui.ink },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: ui.line, marginTop: 8, paddingVertical: 14 },
  totalLabel: { fontFamily: fonts.title, fontSize: 15, color: ui.ink },
  totalValue: { fontFamily: fonts.display, fontSize: 18, color: ui.ink },
  decline: { alignItems: "center", paddingVertical: 16 },
  declineText: { fontFamily: fonts.title, fontSize: 15.5, color: ui.sub },
  step: { fontFamily: fonts.title, fontSize: 16, color: ui.ink, marginBottom: 10 },
  hint: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: ui.sub, marginBottom: 12 },
});
