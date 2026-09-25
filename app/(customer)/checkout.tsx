import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Field, PrimaryButton } from "@/components/ui";
import { colors, radius } from "@/lib/theme";
import { loadBasket, foodTotal, clearBasket } from "@/lib/basket";
import { supabase } from "@/lib/supabase";
import { formatKw } from "@/lib/lipila";
import { createOrder } from "@/lib/orders";
import { LIPILA_PROVIDERS, type LipilaProvider } from "@/lib/lipila";
import { startLipilaPayment } from "@/lib/payments";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Checkout() {
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [delivery, setDelivery] = useState<"bicycle" | "motorbike">("bicycle");
  const [provider, setProvider] = useState<LipilaProvider>("mtn");
  const [phone, setPhone] = useState("");
  const [fees, setFees] = useState({ platform_fee: 10, bicycle_delivery_fee: 15, motorbike_delivery_fee: 25 });
  const [food, setFood] = useState(0);
  const [loading, setLoading] = useState(false);
  const [basketReady, setBasketReady] = useState<any>(null);

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
  }, []);

  const deliveryFee = delivery === "bicycle" ? Number(fees.bicycle_delivery_fee) : Number(fees.motorbike_delivery_fee);
  const platform = Number(fees.platform_fee);
  const total = food + platform + deliveryFee;

  async function pay() {
    if (!basketReady?.marketId || !basketReady.items.length) {
      Alert.alert("Basket empty");
      return;
    }
    if (!address) {
      Alert.alert("Delivery details", "Add a delivery address.");
      return;
    }
    setLoading(true);
    try {
      const order = await createOrder({
        marketId: basketReady.marketId,
        deliveryType: delivery,
        address: { text: address, notes },
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
      <Text style={{ fontSize: 26, fontWeight: "800" }}>Checkout</Text>
      <Text style={{ marginTop: 16, fontWeight: "800" }}>Delivery details</Text>
      <View style={{ height: 10 }} />
      <Field value={address} onChangeText={setAddress} placeholder="Delivery address" />
      <View style={{ height: 10 }} />
      <Field value={notes} onChangeText={setNotes} placeholder="Notes (optional)" />

      <Text style={{ marginTop: 20, fontWeight: "800" }}>Delivery type</Text>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        {(["bicycle", "motorbike"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setDelivery(t)}
            style={{
              flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: "#fff",
              borderWidth: 2, borderColor: delivery === t ? colors.gold : colors.line,
            }}
          >
            <Text style={{ fontWeight: "800", textTransform: "capitalize" }}>{t}</Text>
            <Text style={{ color: colors.muted }}>
              {t === "bicycle" ? `${formatKw(fees.bicycle_delivery_fee)} · slower` : `${formatKw(fees.motorbike_delivery_fee)} · faster`}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ marginTop: 20, fontWeight: "800" }}>Payment summary</Text>
      <Row label="Food total" value={formatKw(food)} />
      <Row label="Platform fee" value={formatKw(platform)} />
      <Row label="Delivery fee" value={formatKw(deliveryFee)} />
      <Row label="Total" value={formatKw(total)} bold />

      <Text style={{ marginTop: 18, fontWeight: "800" }}>Pay with Lipila</Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {LIPILA_PROVIDERS.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => setProvider(p.id)}
            style={{
              paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fff",
              borderWidth: 2, borderColor: provider === p.id ? colors.gold : colors.line,
            }}
          >
            <Text style={{ fontWeight: "700" }}>{p.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ height: 10 }} />
      <Field value={phone} onChangeText={setPhone} placeholder="Mobile money number" keyboardType="phone-pad" />
      <View style={{ height: 16 }} />
      <PrimaryButton label={`Pay now · ${formatKw(total)}`} onPress={pay} loading={loading} />
    </ScrollView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
      <Text style={{ fontWeight: bold ? "800" : "600" }}>{label}</Text>
      <Text style={{ fontWeight: bold ? "800" : "600" }}>{value}</Text>
    </View>
  );
}
