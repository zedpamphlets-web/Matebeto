import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { fonts, ui } from "@/lib/theme";
import { Field } from "@/components/ui";
import { LoadingScreen } from "@/components/spinner";
import { MkHeader, MkScreen, RedButton, goBack } from "@/components/mk";
import { OfflineNotice } from "@/components/offline-notice";
import { InfoBlock, OfferSummary, fetchJobCard, type JobCard } from "@/components/job-card";
import { startRiderSearch } from "@/lib/orders";

/**
 * Rider delivery, as the boss described it:
 *   Request:    Origin (market), Delivery (area), Amount (trip price). Accept or decline.
 *   Accepted:   VENDOR (name, number, market, order number) and DELIVERY (name, number, address, notes).
 *   At vendor:  call the vendor, compare order numbers, type the number and tap Collected.
 *   Delivery:   call the customer; when the food is handed over, enter the customer's OTP to finish.
 */
export default function Job() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [card, setCard] = useState<JobCard | null>(null);
  const [otp, setOtp] = useState("");
  const [pickupNumber, setPickupNumber] = useState("");
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    const { data: o, error } = await supabase.from("orders").select("*").eq("id", id).single();
    if (error || !o) {
      setFailed(true);
      return;
    }
    setOrder(o);
    setCard(await fetchJobCard(String(id)));
    const { data: its } = await supabase.from("order_items").select("*").eq("order_id", id);
    setItems(its || []);
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
    if (!pickupNumber.trim()) return Alert.alert("Order number", "Type the order number the vendor shows you.");
    const { error } = await supabase.rpc("confirm_pickup", { p_order: id, p_number: pickupNumber.trim() });
    if (error) return Alert.alert("Could not confirm", error.message);
    setPickupNumber("");
    await load();
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

  const vendorRows = [
    { label: "Vendor name", value: card?.vendor_name },
    { label: "Vendor number", value: card?.vendor_phone, call: card?.vendor_phone },
    { label: "Market", value: card?.market_name },
    { label: "Order number", value: `#${order.order_number}` },
  ];
  const deliveryRows = [
    { label: "Name", value: card?.customer_name },
    { label: "Number", value: card?.customer_phone, call: card?.customer_phone },
    { label: "Address", value: card?.address },
    { label: "Notes", value: card?.notes },
  ];

  return (
    <MkScreen>
      <MkHeader title="Delivery" onBack={() => goBack("/(rider)")} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {offered && (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>New delivery</Text>
              <OfferSummary card={card} order={order} />
            </View>
            <View style={{ height: 18 }} />
            <RedButton label="Accept" onPress={() => accept(true)} />
            <Pressable onPress={() => accept(false)} style={s.decline}>
              <Text style={s.declineText}>Decline</Text>
            </Pressable>
          </>
        )}

        {toCollect && (
          <>
            <InfoBlock title="Vendor" rows={vendorRows} />
            <InfoBlock title="Delivery" rows={deliveryRows} />
            <Items items={items} />

            <Text style={[s.step, { marginTop: 22 }]}>Check the order number</Text>
            <Text style={s.hint}>Call the vendor and compare order numbers. Type the number the vendor shows, then tap Collected.</Text>
            <Field value={pickupNumber} onChangeText={(t) => setPickupNumber(t.replace(/\D/g, ""))} placeholder="Order number" keyboardType="number-pad" />
            <View style={{ height: 12 }} />
            <RedButton label="Collected" onPress={collected} />
          </>
        )}

        {delivering && (
          <>
            <InfoBlock title="Delivery" rows={deliveryRows} />
            <Items items={items} />

            <Text style={[s.step, { marginTop: 22 }]}>Enter the customer's code</Text>
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

function Items({ items }: { items: any[] }) {
  if (!items.length) return null;
  return (
    <View style={[s.card, { marginTop: 12 }]}>
      <Text style={s.cardTitle}>Items</Text>
      {items.map((it) => (
        <View key={it.id} style={s.itemRow}>
          <Text style={s.itemQty}>{it.quantity}×</Text>
          <Text style={s.itemName}>{it.meal_name}</Text>
        </View>
      ))}
      <View style={{ height: 8 }} />
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
