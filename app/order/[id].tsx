import { useEffect, useState } from "react";
import { Alert, Text, View, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { PrimaryButton } from "@/components/ui";
import { startRiderSearch, startVendorSearch, TRACK_STEPS, stepDone } from "@/lib/orders";
import { verifyLipilaPayment } from "@/lib/payments";

export default function OrderTrack() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [otp, setOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data: o } = await supabase.from("orders").select("*").eq("id", id).single();
    setOrder(o);
    const { data: its } = await supabase.from("order_items").select("*").eq("order_id", id);
    setItems(its || []);
    if (o && ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(o.status)) {
      const { data } = await supabase.rpc("customer_delivery_otp", { p_order: id });
      setOtp(data || null);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [id]);

  async function checkPay() {
    setBusy(true);
    const res = await verifyLipilaPayment(String(id));
    if (res.status === "paid") {
      await supabase.from("orders").update({ status: "PAYMENT_CONFIRMED" }).eq("id", id).eq("status", "CREATED");
      await startVendorSearch(String(id));
    }
    setBusy(false);
    refresh();
  }

  async function nextVendor() {
    setBusy(true);
    const res = await startVendorSearch(String(id));
    setBusy(false);
    if (!res?.ok) Alert.alert("No vendor", "Matebeto could not find a suitable vendor. You can retry or change the basket.");
    refresh();
  }

  async function nextRider() {
    setBusy(true);
    const res = await startRiderSearch(String(id));
    setBusy(false);
    if (!res?.ok) Alert.alert("No rider", "No matching bicycle/motorbike rider is online. Wait or change delivery type with support.");
    refresh();
  }

  if (!order) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={{ fontSize: 26, fontWeight: "800" }}>Order #{order.order_number}</Text>
      <Text style={{ color: colors.muted, marginBottom: 16 }}>{order.status.replaceAll("_", " ")}</Text>
      {TRACK_STEPS.map((s) => (
        <View key={s.key} style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <View style={{
            width: 22, height: 22, borderRadius: 11, marginRight: 10,
            backgroundColor: stepDone(order.status, s.key) ? colors.good : "#fff",
            borderWidth: 1, borderColor: colors.line,
          }} />
          <Text style={{ fontWeight: stepDone(order.status, s.key) ? "800" : "500" }}>{s.label}</Text>
        </View>
      ))}

      <View style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 14, marginTop: 8 }}>
        {items.map((it) => (
          <Text key={it.id} style={{ marginBottom: 4 }}>
            {it.quantity} × {it.meal_name} · {formatKw(it.unit_price * it.quantity)}
          </Text>
        ))}
        <Text style={{ marginTop: 8 }}>Food {formatKw(order.food_total)}</Text>
        <Text>Platform {formatKw(order.platform_fee)}</Text>
        <Text>Delivery {formatKw(order.delivery_fee)}</Text>
        <Text style={{ fontWeight: "800", marginTop: 6 }}>Total {formatKw(order.total)}</Text>
      </View>

      {otp && (
        <View style={{ marginTop: 16, backgroundColor: colors.ink, borderRadius: radius.md, padding: 16 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Give this OTP to the rider</Text>
          <Text style={{ color: colors.gold, fontSize: 32, fontWeight: "800", letterSpacing: 6, marginTop: 6 }}>{otp}</Text>
        </View>
      )}

      {order.payment_status !== "paid" && (
        <View style={{ marginTop: 16 }}>
          <PrimaryButton label="I've paid — check Lipila" onPress={checkPay} loading={busy} />
        </View>
      )}
      {order.payment_status === "paid" && ["SEARCHING_VENDOR", "VENDOR_OFFERED", "NO_VENDOR_FOUND"].includes(order.status) && (
        <View style={{ marginTop: 16 }}>
          <PrimaryButton label="Retry vendor search" onPress={nextVendor} loading={busy} />
        </View>
      )}
      {["VENDOR_ACCEPTED", "SEARCHING_RIDER", "NO_RIDER_AVAILABLE"].includes(order.status) && (
        <View style={{ marginTop: 16 }}>
          <PrimaryButton label="Find a rider" onPress={nextRider} loading={busy} />
        </View>
      )}
    </ScrollView>
  );
}
