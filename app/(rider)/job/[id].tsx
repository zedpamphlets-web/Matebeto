import { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/lib/theme";
import { Field, PrimaryButton } from "@/components/ui";
import { JobSkeleton } from "@/components/skeleton";
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
      <View style={{ flex: 1, backgroundColor: colors.cream, justifyContent: "center" }}>
        <OfflineNotice onRetry={load} />
      </View>
    );
  }
  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream }}>
        <JobSkeleton />
      </View>
    );
  }

  const offered = order.status === "SEARCHING_RIDER" && !order.rider_id;
  const toCollect = order.status === "RIDER_ASSIGNED";
  const delivering = ["PICKED_UP", "OUT_FOR_DELIVERY", "CUSTOMER_NOT_HOME"].includes(order.status);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={{ backgroundColor: colors.brandGreen, borderRadius: 18, padding: 16, marginBottom: 14 }}>
        <Text style={{ color: colors.gold, fontFamily: fonts.bodySemi }}>Order number</Text>
        <Text style={{ color: "#fff", fontFamily: fonts.display, fontSize: 34 }}>#{order.order_number}</Text>
      </View>

      <View style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 14 }}>
        <Row icon="storefront" title="Collect from" value={vendor?.name || "Vendor"} />
        <Row icon="location" title="Deliver to" value={order.delivery_address?.text || "Customer address"} />
        <Row icon="bicycle" title="Delivery" value={order.delivery_type} />
        <Text style={{ marginTop: 6, fontFamily: fonts.title }}>Items</Text>
        {items.map((it) => (
          <Text key={it.id} style={{ fontFamily: fonts.body, marginTop: 2 }}>
            {it.quantity} × {it.meal_name}
          </Text>
        ))}
        <Text style={{ marginTop: 8, fontFamily: fonts.display }}>{formatKw(order.total)}</Text>
      </View>
      <View style={{ height: 16 }} />

      {offered && (
        <>
          <PrimaryButton label="Accept" color={colors.rider} textColor="#fff" onPress={() => accept(true)} />
          <View style={{ height: 10 }} />
          <PrimaryButton label="Decline" color="#fff" onPress={() => accept(false)} />
        </>
      )}

      {toCollect && (
        <>
          <Text style={{ fontFamily: fonts.body, color: colors.muted, marginBottom: 10 }}>
            At the vendor, check that their order number is #{order.order_number}. Then tap Collected.
          </Text>
          <PrimaryButton label={`Collected · #${order.order_number}`} color={colors.rider} textColor="#fff" onPress={collected} />
        </>
      )}

      {delivering && (
        <>
          <Text style={{ fontFamily: fonts.title, fontSize: 16, marginBottom: 8 }}>1. Call the customer</Text>
          <PrimaryButton label="Call customer" color={colors.brandGreen} textColor="#fff" onPress={callCustomer} />

          <Text style={{ fontFamily: fonts.title, fontSize: 16, marginTop: 22, marginBottom: 4 }}>2. Enter the customer's code</Text>
          <Text style={{ fontFamily: fonts.body, color: colors.muted, marginBottom: 10 }}>
            When you hand over the food, the customer gives you their code.
          </Text>
          <Field value={otp} onChangeText={(t) => setOtp(t.replace(/\D/g, ""))} placeholder="Customer code" keyboardType="number-pad" />
          <View style={{ height: 12 }} />
          <PrimaryButton label="Complete delivery" color={colors.gold} onPress={complete} />
        </>
      )}

      {order.status === "SUPPORT_REQUIRED" && (
        <View style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 14, marginTop: 8 }}>
          <Text style={{ fontFamily: fonts.body }}>
            Matebeto support is looking at this delivery. Wait for their call.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Row({ icon, title, value }: { icon: keyof typeof Ionicons.glyphMap; title: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
      <Ionicons name={icon} size={18} color={colors.brandGreen} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.title }}>{title}</Text>
        <Text style={{ fontFamily: fonts.body, color: colors.muted, textTransform: "capitalize" }}>{value}</Text>
      </View>
    </View>
  );
}
