import { useEffect, useState } from "react";
import { Alert, Text, View, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/lib/theme";
import { Field, PrimaryButton } from "@/components/ui";
import { formatKw } from "@/lib/lipila";

export default function Job() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [vendor, setVendor] = useState<any>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: o } = await supabase.from("orders").select("*").eq("id", id).single();
    setOrder(o);
    const { data: its } = await supabase.from("order_items").select("*").eq("order_id", id);
    setItems(its || []);
    if (o?.vendor_id) {
      const { data: v } = await supabase.from("vendors").select("*").eq("id", o.vendor_id).single();
      setVendor(v);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function accept(yes: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc("rider_respond", { p_order: id, p_accept: yes });
    setBusy(false);
    if (error) return Alert.alert("Could not respond", error.message);
    if (!yes) router.back();
    load();
  }

  async function pickup() {
    setBusy(true);
    const { error } = await supabase.rpc("confirm_pickup", { p_order: id });
    setBusy(false);
    if (error) return Alert.alert("Pickup", error.message);
    load();
  }

  async function complete() {
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_delivery_otp", { p_order: id, p_code: otp });
    setBusy(false);
    if (error) return Alert.alert("OTP", error.message);
    if (!data?.ok) return Alert.alert("Wrong OTP", "Delivery is not completed.");
    Alert.alert("Delivered", "Order completed. Settlement can now run.");
    router.replace("/(rider)");
  }

  if (!order) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "800" }}>Order #{order.order_number}</Text>
      <Text style={{ color: colors.muted, marginBottom: 12 }}>{order.status.replaceAll("_", " ")}</Text>
      <View style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 14 }}>
        <Text style={{ fontWeight: "800" }}>Pickup</Text>
        <Text>{vendor?.name || "Vendor"} · {vendor?.phone}</Text>
        <Text style={{ marginTop: 10, fontWeight: "800" }}>Drop-off</Text>
        <Text>{order.delivery_address?.text}</Text>
        <Text style={{ marginTop: 10, fontWeight: "800" }}>Type</Text>
        <Text style={{ textTransform: "capitalize" }}>{order.delivery_type}</Text>
        <Text style={{ marginTop: 10, fontWeight: "800" }}>Items</Text>
        {items.map((it) => <Text key={it.id}>{it.quantity} × {it.meal_name}</Text>)}
        <Text style={{ marginTop: 8 }}>{formatKw(order.total)}</Text>
      </View>
      <View style={{ height: 16 }} />
      {order.status === "SEARCHING_RIDER" && (
        <>
          <PrimaryButton label="Accept job" color={colors.rider} textColor="#fff" onPress={() => accept(true)} loading={busy} />
          <View style={{ height: 10 }} />
          <PrimaryButton label="Decline" color="#fff" onPress={() => accept(false)} />
        </>
      )}
      {order.status === "RIDER_ASSIGNED" && (
        <PrimaryButton label={`Confirm pickup #${order.order_number}`} onPress={pickup} loading={busy} />
      )}
      {["PICKED_UP", "OUT_FOR_DELIVERY"].includes(order.status) && (
        <>
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>Customer OTP</Text>
          <Field value={otp} onChangeText={setOtp} placeholder="Enter customer OTP" keyboardType="number-pad" />
          <View style={{ height: 12 }} />
          <PrimaryButton label="Verify OTP and complete" color={colors.ink} textColor="#fff" onPress={complete} loading={busy} />
          <Text style={{ color: colors.muted, marginTop: 10 }}>
            There is no force-complete button. Wrong OTP means the order stays open.
          </Text>
        </>
      )}
    </ScrollView>
  );
}
