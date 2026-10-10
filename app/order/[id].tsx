import { useEffect, useState } from "react";
import { Alert, Text, View, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { PrimaryButton } from "@/components/ui";
import { TRACK_STEPS, stepDone } from "@/lib/orders";
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
    await verifyLipilaPayment(String(id));
    setBusy(false);
    refresh();
  }

  async function cancel() {
    Alert.alert("Cancel order?", "This cannot be undone.", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          const { error } = await supabase.rpc("customer_cancel", { p_order: id });
          setBusy(false);
          if (error) Alert.alert("Could not cancel", error.message);
          refresh();
        },
      },
    ]);
  }

  if (!order) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  const delivered = order.status === "COMPLETED";
  const failed = ["NO_VENDOR_FOUND", "CANCELLED", "DELIVERY_FAILED"].includes(order.status);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {delivered ? (
        <View
          style={{
            backgroundColor: colors.customerDeep,
            borderRadius: 22,
            padding: 22,
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <Ionicons name="checkmark-circle" size={64} color="#fff" />
          <Text style={{ color: "#fff", fontFamily: fonts.display, fontSize: 28, marginTop: 8 }}>Delivered!</Text>
          <Text style={{ color: colors.goldSoft, fontFamily: fonts.title, fontSize: 18, marginTop: 4 }}>
            Order #{order.order_number}
          </Text>
          <Text style={{ color: "#fff", fontFamily: fonts.body, marginTop: 8 }}>Thank you</Text>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 22,
            padding: 22,
            alignItems: "center",
            marginBottom: 18,
            borderWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Ionicons name={failed ? "alert-circle" : "checkmark-circle"} size={56} color={failed ? colors.danger : colors.customer} />
          <Text style={{ fontFamily: fonts.display, fontSize: 24, marginTop: 8 }}>
            {failed ? "We need a moment" : "Order Placed!"}
          </Text>
          <Text style={{ fontFamily: fonts.title, fontSize: 18, color: colors.muted }}>Order #{order.order_number}</Text>
        </View>
      )}

      {TRACK_STEPS.map((s) => (
        <View key={s.key} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              marginRight: 10,
              backgroundColor: stepDone(order.status, s.key) ? colors.good : "#fff",
              borderWidth: 1,
              borderColor: colors.line,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {stepDone(order.status, s.key) ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
          </View>
          <Text style={{ fontFamily: stepDone(order.status, s.key) ? fonts.title : fonts.body, color: colors.ink }}>
            {s.label}
          </Text>
        </View>
      ))}

      {order.status === "OUT_FOR_DELIVERY" && (
        <View style={{ backgroundColor: colors.ink, borderRadius: radius.md, padding: 16, marginTop: 8, marginBottom: 8 }}>
          <Text style={{ color: "#fff", fontFamily: fonts.title }}>On the way</Text>
          <Text style={{ color: colors.goldSoft, fontFamily: fonts.body, marginTop: 4 }}>
            Order #{order.order_number} · {order.delivery_type}
          </Text>
        </View>
      )}

      <View style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 14, marginTop: 8 }}>
        {items.map((it) => (
          <Text key={it.id} style={{ marginBottom: 4, fontFamily: fonts.body }}>
            {it.quantity} × {it.meal_name} · {formatKw(it.unit_price * it.quantity)}
          </Text>
        ))}
        <Text style={{ marginTop: 8, fontFamily: fonts.body }}>Food {formatKw(order.food_total)}</Text>
        <Text style={{ fontFamily: fonts.body }}>Platform {formatKw(order.platform_fee)}</Text>
        <Text style={{ fontFamily: fonts.body }}>Delivery {formatKw(order.delivery_fee)}</Text>
        <Text style={{ fontFamily: fonts.display, marginTop: 6 }}>Total {formatKw(order.total)}</Text>
      </View>

      {otp && (
        <View style={{ marginTop: 16, backgroundColor: colors.ink, borderRadius: radius.md, padding: 16 }}>
          <Text style={{ color: "#fff", fontFamily: fonts.title }}>Give this OTP to the rider</Text>
          <Text style={{ color: colors.gold, fontSize: 32, fontFamily: fonts.display, letterSpacing: 6, marginTop: 6 }}>
            {otp}
          </Text>
        </View>
      )}

      {order.status === "SUPPORT_REQUIRED" && (
        <View style={{ marginTop: 16, backgroundColor: "#fff3cd", borderRadius: radius.md, padding: 14 }}>
          <Text style={{ fontFamily: fonts.title }}>Support is needed</Text>
          <Text style={{ fontFamily: fonts.body, marginTop: 4 }}>
            This order needs help from Matebeto support. Nobody will be paid until the correct OTP is entered.
          </Text>
        </View>
      )}
      {order.status === "CUSTOMER_NOT_HOME" && (
        <View style={{ marginTop: 16, backgroundColor: "#fff3cd", borderRadius: radius.md, padding: 14 }}>
          <Text style={{ fontFamily: fonts.title }}>Rider is waiting</Text>
          <Text style={{ fontFamily: fonts.body, marginTop: 4 }}>
            The rider could not find you. They will wait a few minutes then the order will go to support.
          </Text>
        </View>
      )}
      {order.status === "NO_VENDOR_FOUND" && (
        <View style={{ marginTop: 16, backgroundColor: "#f8d7da", borderRadius: radius.md, padding: 14 }}>
          <Text style={{ fontFamily: fonts.title }}>No vendor available</Text>
          <Text style={{ fontFamily: fonts.body, marginTop: 4 }}>
            We tried 3 vendors. If you paid, a refund has been marked for review.
          </Text>
        </View>
      )}
      {order.status === "NO_RIDER_AVAILABLE" && (
        <View style={{ marginTop: 16, backgroundColor: "#f8d7da", borderRadius: radius.md, padding: 14 }}>
          <Text style={{ fontFamily: fonts.title }}>No rider available</Text>
          <Text style={{ fontFamily: fonts.body, marginTop: 4 }}>
            No matching {order.delivery_type} rider is online. If you paid, a refund has been marked for review.
          </Text>
        </View>
      )}

      {["CREATED", "PAYMENT_CONFIRMED", "SEARCHING_VENDOR", "VENDOR_OFFERED"].includes(order.status) && (
        <View style={{ marginTop: 16 }}>
          <PrimaryButton label="Cancel order" onPress={cancel} loading={busy} />
        </View>
      )}

      {order.payment_status !== "paid" && order.status === "CREATED" && (
        <View style={{ marginTop: 16 }}>
          <PrimaryButton label="I've paid — check status" onPress={checkPay} loading={busy} />
        </View>
      )}
    </ScrollView>
  );
}
