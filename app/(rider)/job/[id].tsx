import { useEffect, useState } from "react";
import { Alert, Text, View, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { Field, PrimaryButton } from "@/components/ui";
import { formatKw } from "@/lib/lipila";
import { startRiderSearch } from "@/lib/orders";

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

  useEffect(() => {
    load();
  }, [id]);

  async function accept(yes: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc("rider_respond", { p_order: id, p_accept: yes });
    setBusy(false);
    if (error) return Alert.alert("Could not respond", error.message);
    if (!yes) {
      await startRiderSearch(String(id)).catch(() => null);
      router.back();
      return;
    }
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
    if (!data?.ok) return Alert.alert("Wrong OTP", "Delivery is not completed. Ask the customer again.");
    Alert.alert("Delivered", `Order #${order.order_number} completed. Settlement can now run.`);
    router.replace("/(rider)");
  }

  if (!order) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  const offered = ["SEARCHING_RIDER"].includes(order.status) && !order.rider_id;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={{ backgroundColor: colors.customer, borderRadius: 18, padding: 16, marginBottom: 14 }}>
        <Text style={{ color: "#fff", fontFamily: fonts.bodySemi }}>New Delivery</Text>
        <Text style={{ color: "#fff", fontFamily: fonts.display, fontSize: 26 }}>Order #{order.order_number}</Text>
      </View>

      <View style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 14 }}>
        <Row icon="storefront" title="Pickup" value={`${vendor?.name || "Vendor"} · confirm #${order.order_number}`} />
        <Row icon="location" title="Drop-off" value={order.delivery_address?.text || "Customer address"} />
        <Row icon="bicycle" title="Type" value={order.delivery_type} />
        <Text style={{ marginTop: 10, fontFamily: fonts.title }}>Items</Text>
        {items.map((it) => (
          <Text key={it.id} style={{ fontFamily: fonts.body }}>
            {it.quantity} × {it.meal_name}
          </Text>
        ))}
        <Text style={{ marginTop: 8, fontFamily: fonts.display }}>{formatKw(order.total)}</Text>
      </View>
      <View style={{ height: 16 }} />
      {offered && (
        <>
          <PrimaryButton label="Accept" color={colors.customer} textColor="#fff" onPress={() => accept(true)} loading={busy} />
          <View style={{ height: 10 }} />
          <PrimaryButton label="Decline" color="#fff" onPress={() => accept(false)} />
        </>
      )}
      {order.status === "RIDER_ASSIGNED" && (
        <PrimaryButton
          label={`Marked Picked Up · #${order.order_number}`}
          onPress={pickup}
          loading={busy}
        />
      )}
      {["PICKED_UP", "OUT_FOR_DELIVERY"].includes(order.status) && (
        <>
          <Text style={{ fontFamily: fonts.title, marginBottom: 8 }}>Customer OTP</Text>
          <Field value={otp} onChangeText={setOtp} placeholder="Enter customer OTP" keyboardType="number-pad" />
          <View style={{ height: 12 }} />
          <PrimaryButton label="Verify OTP" color={colors.ink} textColor="#fff" onPress={complete} loading={busy} />
          <Text style={{ color: colors.muted, marginTop: 10, fontFamily: fonts.body }}>
            There is no force-complete button. The OTP is the only way this order can finish.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function Row({ icon, title, value }: { icon: keyof typeof Ionicons.glyphMap; title: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
      <Ionicons name={icon} size={18} color={colors.customer} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.title }}>{title}</Text>
        <Text style={{ fontFamily: fonts.body, color: colors.muted, textTransform: "capitalize" }}>{value}</Text>
      </View>
    </View>
  );
}
