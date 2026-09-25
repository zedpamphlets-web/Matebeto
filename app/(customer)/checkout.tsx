import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Field, MoneyRow, PrimaryButton } from "@/components/ui";
import { colors, fonts, radius } from "@/lib/theme";
import { loadBasket, foodTotal, clearBasket } from "@/lib/basket";
import { supabase } from "@/lib/supabase";
import { formatKw } from "@/lib/lipila";
import { createOrder } from "@/lib/orders";
import { LIPILA_PROVIDERS, type LipilaProvider } from "@/lib/lipila";
import { startLipilaPayment } from "@/lib/payments";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Checkout() {
  const [delivery, setDelivery] = useState<"bicycle" | "motorbike">("bicycle");
  const [provider, setProvider] = useState<LipilaProvider>("mtn");
  const [phone, setPhone] = useState("");
  const [fees, setFees] = useState({ platform_fee: 10, bicycle_delivery_fee: 15, motorbike_delivery_fee: 25 });
  const [food, setFood] = useState(0);
  const [loading, setLoading] = useState(false);
  const [basketReady, setBasketReady] = useState<any>(null);
  const [address, setAddress] = useState({ text: "", notes: "" });

  useEffect(() => {
    loadBasket().then((b) => {
      setBasketReady(b);
      setFood(foodTotal(b.items));
    });
    supabase.from("settings").select("*").eq("id", 1).single().then(({ data }) => data && setFees(data));
    supabase.auth.getUser().then(({ data }) => setPhone(data.user?.phone || ""));
    AsyncStorage.getItem("matebeto.delivery").then((v) => {
      if (v === "bicycle" || v === "motorbike") setDelivery(v);
    });
    AsyncStorage.getItem("matebeto.address").then((raw) => {
      if (raw) setAddress(JSON.parse(raw));
    });
  }, []);

  const deliveryFee = delivery === "bicycle" ? Number(fees.bicycle_delivery_fee) : Number(fees.motorbike_delivery_fee);
  const platform = Number(fees.platform_fee);
  const total = food + platform + deliveryFee;

  async function pay() {
    if (!basketReady?.marketId || !basketReady.items.length) {
      Alert.alert("Basket empty");
      return;
    }
    if (!address.text) {
      Alert.alert("Delivery details", "Add a delivery address on the previous screen.");
      return;
    }
    setLoading(true);
    try {
      const order = await createOrder({
        marketId: basketReady.marketId,
        deliveryType: delivery,
        address,
        items: basketReady.items,
      });
      await startLipilaPayment({ provider, orderId: order.id, phone });
      await clearBasket();
      router.replace(`/order/${order.id}`);
    } catch (e: any) {
      Alert.alert("Payment", e.message || "Could not start payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={{ backgroundColor: "#fff", borderRadius: radius.md, padding: 16, marginBottom: 16 }}>
        <MoneyRow label="Food Total" value={formatKw(food)} />
        <MoneyRow label="Platform Fee" value={formatKw(platform)} />
        <MoneyRow label="Delivery Fee" value={formatKw(deliveryFee)} />
        <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 10 }} />
        <MoneyRow label="Total" value={formatKw(total)} bold />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <Ionicons name="shield-checkmark" size={18} color={colors.customer} />
        <Text style={{ color: colors.muted, fontFamily: fonts.body }}>Secure payment. Your payment is protected.</Text>
      </View>

      <Text style={{ fontFamily: fonts.title }}>Pay with Lipila</Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {LIPILA_PROVIDERS.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => setProvider(p.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: "#fff",
              borderWidth: 2,
              borderColor: provider === p.id ? colors.gold : colors.line,
            }}
          >
            <Text style={{ fontFamily: fonts.bodySemi }}>{p.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ height: 10 }} />
      <Field value={phone} onChangeText={setPhone} placeholder="Mobile money number" keyboardType="phone-pad" />
      <View style={{ height: 16 }} />
      <PrimaryButton
        label={`Pay Now · ${formatKw(total)}`}
        color={colors.customer}
        textColor="#fff"
        onPress={pay}
        loading={loading}
      />
    </ScrollView>
  );
}
