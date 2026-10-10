import { useEffect, useState } from "react";
import { Alert, Text, View, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { Field, PrimaryButton } from "@/components/ui";
import { formatKw } from "@/lib/lipila";
import { startRiderSearch } from "@/lib/orders";

const ACTIVE = ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "CUSTOMER_NOT_HOME"];

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
      const { data: name } = await supabase.rpc("order_vendor_name", { p_order: id });
      setVendor({ name: name || "Vendor" });
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
    if (!data?.ok) {
      if (data?.reason === "LOCKED_AFTER_5" || data?.reason === "LOCKED") {
        Alert.alert("Too many wrong codes", "This delivery is locked. Matebeto support has been notified and will contact you.");
        load();
        return;
      }
      const left = typeof data?.attempts_left === "number" ? ` You have ${data.attempts_left} tries left.` : "";
      return Alert.alert("Wrong OTP", `Delivery is not completed. Ask the customer again.${left}`);
    }
    Alert.alert("Delivered", `Order #${order.order_number} completed.`);
    router.replace("/(rider)");
  }

  async function notHome() {
    setBusy(true);
    const { data, error } = await supabase.rpc("customer_not_home", { p_order: id });
    setBusy(false);
    if (error) return Alert.alert("Customer not home", error.message);
    Alert.alert(
      "Wait for the customer",
      `Call or message the customer and wait about ${data?.wait_minutes ?? 10} minutes. If they arrive, enter their code. If not, Matebeto support takes over. You cannot complete this order without the code.`
    );
    load();
  }

  function reportProblem() {
    Alert.alert("Can't complete this delivery?", "Matebeto support will be told and may give the order to another rider.", [
      { text: "Go back", style: "cancel" },
      {
        text: "Report problem",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          const { error } = await supabase.rpc("rider_report_problem", {
            p_order: id,
            p_reason: "Rider could not complete the delivery",
          });
          setBusy(false);
          if (error) return Alert.alert("Could not report", error.message);
          load();
        },
      },
    ]);
  }

  if (!order) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  const offered = ["SEARCHING_RIDER"].includes(order.status) && !order.rider_id;
  const canEnterOtp = ["PICKED_UP", "OUT_FOR_DELIVERY", "CUSTOMER_NOT_HOME"].includes(order.status);

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
        <PrimaryButton label={`Marked Picked Up · #${order.order_number}`} onPress={pickup} loading={busy} />
      )}

      {canEnterOtp && (
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

      {order.status === "OUT_FOR_DELIVERY" && (
        <View style={{ marginTop: 14 }}>
          <PrimaryButton label="Customer not home" color="#fff" onPress={notHome} loading={busy} />
        </View>
      )}

      {order.status === "CUSTOMER_NOT_HOME" && (
        <Text style={{ color: colors.muted, marginTop: 14, fontFamily: fonts.body }}>
          Waiting for the customer. If they do not arrive, Matebeto support will take over.
        </Text>
      )}

      {order.status === "SUPPORT_REQUIRED" && (
        <View style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 14, marginTop: 8 }}>
          <Text style={{ fontFamily: fonts.body }}>
            Matebeto support is looking at this delivery. Wait for their instructions.
          </Text>
        </View>
      )}

      {ACTIVE.includes(order.status) && (
        <View style={{ marginTop: 14 }}>
          <PrimaryButton label="I can't complete this delivery" color="#fff" onPress={reportProblem} loading={busy} />
        </View>
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
