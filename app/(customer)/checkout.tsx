import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MkField, MkHeader, MkScreen, RedButton } from "@/components/mk";
import { supabase } from "@/lib/supabase";
import { loadAccount } from "@/lib/profile";
import { clearBasket, EMPTY_BASKET, foodTotal, loadBasket, type BasketState } from "@/lib/basket";
import { createOrder } from "@/lib/orders";
import { LIPILA_PROVIDERS, type LipilaProvider } from "@/lib/lipila";
import { kw } from "@/lib/format";
import { fonts, ui } from "@/lib/theme";

type Fees = { platform: number; bicycle: number; motorbike: number; txnPct: number };

/** Last step: full amount (all fees from the Admin dashboard), payment method, Pay Now. */
export default function Checkout() {
  const [basket, setBasket] = useState<BasketState>(EMPTY_BASKET);
  const [fees, setFees] = useState<Fees | null>(null);
  const [delivery, setDelivery] = useState<"bicycle" | "motorbike">("bicycle");
  const [address, setAddress] = useState({ text: "", notes: "" });
  const [provider, setProvider] = useState<LipilaProvider>("mtn");
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadBasket().then(setBasket);
    supabase.from("settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) {
        setFees({
          platform: Number(data.platform_fee),
          bicycle: Number(data.bicycle_delivery_fee),
          motorbike: Number(data.motorbike_delivery_fee),
          txnPct: Number(data.transaction_fee_percent || 0),
        });
      }
    });
    (async () => {
      const t = await AsyncStorage.getItem("matebeto.delivery");
      if (t === "bicycle" || t === "motorbike") setDelivery(t);
      const rawAddr = await AsyncStorage.getItem("matebeto.address");
      if (rawAddr) setAddress(JSON.parse(rawAddr));
      const rawPay = await AsyncStorage.getItem("matebeto.payment");
      const pay = rawPay ? JSON.parse(rawPay) : null;
      const { data } = await supabase.auth.getUser();
      const { details } = await loadAccount();
      setPhone(pay?.phone || details.payment_number || data.user?.phone || "");
      setProvider((pay?.provider || details.payment_provider || "mtn") as LipilaProvider);
    })();
  }, []);

  const items = foodTotal(basket.items);
  const platform = fees?.platform ?? 0;
  const deliveryFee = fees ? (delivery === "bicycle" ? fees.bicycle : fees.motorbike) : 0;
  const txn = fees ? Math.round((items + platform + deliveryFee) * fees.txnPct) / 100 : 0;
  const total = items + platform + deliveryFee + txn;

  async function pay() {
    if (!basket.marketId || !basket.items.length) {
      router.replace("/(customer)/basket");
      return;
    }
    if (phone.replace(/\D/g, "").length < 9) {
      Alert.alert("Payment method", "Enter the mobile money number you will pay with.");
      return;
    }
    setPaying(true);
    try {
      await AsyncStorage.setItem("matebeto.payment", JSON.stringify({ provider, phone: phone.trim() }));
      const order = await createOrder({
        marketId: basket.marketId,
        vendorId: basket.vendorId,
        deliveryType: delivery,
        address,
        items: basket.items,
      });
      await clearBasket();
      router.replace(`/payment/${order.id}?provider=${provider}&phone=${encodeURIComponent(phone.trim())}`);
    } catch (e: any) {
      Alert.alert("Payment", e.message || "Could not start payment.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <MkScreen>
      <MkHeader title="Checkout" subtitle={basket.vendorName || undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text style={s.h}>Order summary</Text>
        <Row label="Items Total" value={kw(items)} />
        <Row label="Platform Fee" value={fees ? kw(platform) : "…"} />
        <Row label={`Delivery Fee (${delivery === "bicycle" ? "Bicycle" : "Motorbike"})`} value={fees ? kw(deliveryFee) : "…"} />
        {txn > 0 ? <Row label={`Transaction Charge (${fees?.txnPct}%)`} value={kw(txn)} /> : null}
        <View style={s.totalBand}>
          <Text style={s.totalText}>Total</Text>
          <Text style={s.totalText}>{fees ? kw(total) : "…"}</Text>
        </View>

        <View style={s.card}>
          <Ionicons name="location-outline" size={22} color={ui.btn} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.cTitle}>Delivery Address</Text>
            <Text style={s.cText} numberOfLines={2}>{address.text || "Add a delivery address"}</Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={s.change}>Change</Text>
          </Pressable>
        </View>

        <Text style={s.h}>Pay with mobile money</Text>
        <View style={s.chips}>
          {LIPILA_PROVIDERS.map((p) => {
            const on = provider === p.id;
            return (
              <Pressable key={p.id} onPress={() => setProvider(p.id)} style={[s.chip, on && { borderColor: ui.btn, backgroundColor: "#EAF4EF" }]}>
                <Text style={s.chipText}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ height: 12 }} />
        <MkField value={phone} onChangeText={setPhone} placeholder="Mobile money number" keyboardType="phone-pad" />
        <View style={s.secure}>
          <Ionicons name="shield-checkmark" size={18} color="#1F9D55" />
          <Text style={s.secureText}>Secure payment. You approve it on your phone.</Text>
        </View>
      </ScrollView>
      <View style={s.footer}>
        <RedButton label={fees ? `Pay Now · ${kw(total)}` : "Pay Now"} icon="lock-closed-outline" onPress={pay} loading={paying} disabled={!fees} />
      </View>
    </MkScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontFamily: fonts.title, fontSize: 15, color: ui.ink, marginTop: 8, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  rowLabel: { fontFamily: fonts.body, fontSize: 13, color: ui.ink },
  rowValue: { fontFamily: fonts.title, fontSize: 13.5, color: ui.ink },
  totalBand: { marginTop: 10, backgroundColor: ui.redSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between" },
  totalText: { fontFamily: fonts.display, fontSize: 18, color: ui.red },
  card: { backgroundColor: "#F8F8F9", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 8 },
  cTitle: { fontFamily: fonts.title, fontSize: 14, color: ui.ink },
  cText: { fontFamily: fonts.body, fontSize: 12, color: ui.sub, marginTop: 2 },
  change: { fontFamily: fonts.bodySemi, fontSize: 12.5, color: "#1F9D55" },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: ui.line },
  chipText: { fontFamily: fonts.bodySemi, color: ui.ink },
  secure: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  secureText: { color: ui.sub, fontFamily: fonts.body, fontSize: 12.5 },
  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: "#fff" },
});
