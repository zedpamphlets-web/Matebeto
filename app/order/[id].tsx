import { useEffect, useState } from "react";
import { Alert, Text, View, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { PrimaryButton } from "@/components/ui";
import { startRiderSearch, TRACK_STEPS, stepDone } from "@/lib/orders";
import { verifyLipilaPayment } from "@/lib/payments";

const CANCELLABLE = ["CREATED", "PAYMENT_CONFIRMED", "SEARCHING_VENDOR", "VENDOR_OFFERED", "NO_VENDOR_FOUND"];
const OTP_STATUSES = ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "CUSTOMER_NOT_HOME", "SUPPORT_REQUIRED"];
const PROBLEM_STATUSES = ["NO_VENDOR_FOUND", "CANCELLED", "DELIVERY_FAILED", "SUPPORT_REQUIRED", "NO_RIDER_AVAILABLE"];

export default function OrderTrack() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [otp, setOtp] = useState<string | null>(null);
  const [supportPhone, setSupportPhone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data: o } = await supabase.from("orders").select("*").eq("id", id).single();
    setOrder(o);
    const { data: its } = await supabase.from("order_items").select("*").eq("order_id", id);
    setItems(its || []);
    if (o && OTP_STATUSES.includes(o.status)) {
      const { data } = await supabase.rpc("customer_delivery_otp", { p_order: id });
      setOtp(data || null);
    }
  }

  useEffect(() => {
    refresh();
    supabase
      .from("settings")
      .select("support_phone")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setSupportPhone(data?.support_phone || null));
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [id]);

  // Backup for the payment callback. The server starts the vendor search by itself.
  async function checkPay() {
    setBusy(true);
    await verifyLipilaPayment(String(id));
    setBusy(false);
    refresh();
  }

  async function retryRider() {
    setBusy(true);
    try {
      const res = await startRiderSearch(String(id));
      if (!res?.ok && res?.reason === "NO_RIDER_AVAILABLE") {
        Alert.alert(
          "No matching rider",
          "No bicycle/motorbike rider of the type you chose is online. Wait and try again, or contact support. The vehicle type will not be silently swapped."
        );
      }
    } catch (e: any) {
      Alert.alert("Could not search", e?.message || "Please try again.");
    }
    setBusy(false);
    refresh();
  }

  function confirmCancel() {
    const paid = order?.payment_status === "paid";
    Alert.alert(
      "Cancel this order?",
      paid ? "Your payment will be marked for a refund." : "You have not been charged for a completed payment.",
      [
        { text: "Keep order", style: "cancel" },
        { text: "Cancel order", style: "destructive", onPress: doCancel },
      ]
    );
  }

  async function doCancel() {
    setBusy(true);
    const { data, error } = await supabase.rpc("customer_cancel", { p_order: id });
    setBusy(false);
    if (error) Alert.alert("Could not cancel", error.message);
    else if (!data?.ok) Alert.alert("Could not cancel", data?.reason || "Please contact support.");
    refresh();
  }

  if (!order) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  const delivered = order.status === "COMPLETED";
  const failed = PROBLEM_STATUSES.includes(order.status);
  const support = supportPhone ? ` Support: ${supportPhone}` : "";

  let notice: string | null = null;
  if (order.status === "NO_VENDOR_FOUND") {
    notice = "Matebeto could not find a suitable vendor after 3 attempts. You can cancel for a refund, or place a new order with a different basket.";
  } else if (order.status === "NO_RIDER_AVAILABLE") {
    notice = `No ${order.delivery_type} rider is online right now. Your food partner has your order. Try again in a moment.${support}`;
  } else if (order.status === "SUPPORT_REQUIRED") {
    notice = `Our support team is looking after your delivery.${support}`;
  } else if (order.status === "CUSTOMER_NOT_HOME") {
    notice = "Your rider is at your door. Please give them the code below.";
  } else if (order.status === "CANCELLED") {
    notice =
      order.payment_status === "refund_pending"
        ? "This order was cancelled. Your refund is being processed."
        : order.payment_status === "refunded"
        ? "This order was cancelled and refunded."
        : "This order was cancelled.";
  }

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

      {notice && (
        <View style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.line }}>
          <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{notice}</Text>
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

      {order.status === "CREATED" && order.payment_status !== "paid" && (
        <View style={{ marginTop: 16 }}>
          <PrimaryButton label="I've paid — check Lipila" onPress={checkPay} loading={busy} />
        </View>
      )}
      {order.status === "NO_RIDER_AVAILABLE" && (
        <View style={{ marginTop: 16 }}>
          <PrimaryButton label="Try finding a rider again" onPress={retryRider} loading={busy} />
        </View>
      )}
      {CANCELLABLE.includes(order.status) && (
        <View style={{ marginTop: 12 }}>
          <PrimaryButton label="Cancel order" color="#fff" onPress={confirmCancel} loading={busy} />
        </View>
      )}
    </ScrollView>
  );
}
