import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MoneyRow } from "@/components/ui";
import { AppHeader, DarkField, DarkScreen, GoldButton } from "@/components/app-shell";
import { colors, fonts, radius } from "@/lib/theme";
import { loadBasket, foodTotal, clearBasket } from "@/lib/basket";
import { supabase } from "@/lib/supabase";
import { formatKw } from "@/lib/lipila";
import { createOrder } from "@/lib/orders";
import { LIPILA_PROVIDERS, type LipilaProvider } from "@/lib/lipila";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadAccount } from "@/lib/profile";

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
    // use the payment method saved on the account; fall back to the login number
    (async () => {
      const { data } = await supabase.auth.getUser();
      const { details } = await loadAccount();
      setPhone(details.payment_number || data.user?.phone || "");
      if (details.payment_provider) setProvider(details.payment_provider);
    })();
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
    const mk = basketReady?.marketId;
    if (!mk || mk === "null" || mk === "undefined") {
      Alert.alert("Choose your market", "Your basket has no market yet. Open Thornpark, Longacres or Olympia and add a meal from there.");
      return;
    }
    if (!basketReady.items.length) {
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
      await clearBasket();
      router.replace(`/payment/${order.id}?provider=${provider}&phone=${encodeURIComponent(phone)}`);
    } catch (e: any) {
      Alert.alert("Payment", e.message || "Could not start payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DarkScreen>
      <AppHeader title="Payment Summary" back />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: radius.md,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#EBEBEF",
          }}
        >
          <MoneyRow label="Food Total" value={formatKw(food)} />
          <MoneyRow label="Platform Fee" value={formatKw(platform)} />
          <MoneyRow label="Delivery Fee" value={formatKw(deliveryFee)} />
          <View style={{ height: 1, backgroundColor: "#EBEBEF", marginVertical: 10 }} />
          <MoneyRow label="Total" value={formatKw(total)} bold />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Ionicons name="shield-checkmark" size={18} color={colors.customer} />
          <Text style={{ color: "#6B6A78", fontFamily: fonts.body }}>Secure payment. Your payment is protected.</Text>
        </View>

        <Text style={{ fontFamily: fonts.title, color: "#1C1B26" }}>Pay with mobile money</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {LIPILA_PROVIDERS.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setProvider(p.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: "#FFFFFF",
                borderWidth: 2,
                borderColor: provider === p.id ? "#D6263A" : "#EBEBEF",
              }}
            >
              <Text style={{ fontFamily: fonts.bodySemi, color: "#1C1B26" }}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ height: 10 }} />
        <DarkField value={phone} onChangeText={setPhone} placeholder="Mobile money number" keyboardType="phone-pad" />
        <View style={{ height: 8 }} />
        <GoldButton label={`Pay now · ${formatKw(total)}`} onPress={pay} loading={loading} />
      </ScrollView>
    </DarkScreen>
  );
}
