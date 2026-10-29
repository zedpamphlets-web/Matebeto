import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Photo } from "@/components/photo";
import { EmptyState } from "@/components/empty-state";
import { BasketSkeleton } from "@/components/skeleton";
import { OfflineNotice } from "@/components/offline-notice";
import { confirmDialog } from "@/components/confirm";
import { MkHeader, MkScreen, MkStepper, RedButton, goBack } from "@/components/mk";
import { clearBasket, EMPTY_BASKET, foodTotal, loadBasket, saveBasket, type BasketState } from "@/lib/basket";
import { supabase } from "@/lib/supabase";
import { createOrder } from "@/lib/orders";
import { deliveryAddressFrom, loadAccount } from "@/lib/profile";
import { LIPILA_PROVIDERS, type LipilaProvider } from "@/lib/lipila";
import { fonts, ui } from "@/lib/theme";
import { kw, marketShortName } from "@/lib/format";
import { isOnline, withTimeout } from "@/lib/network";

type Fees = { platform_fee: number; bicycle_delivery_fee: number; motorbike_delivery_fee: number; transaction_fee_percent: number };

/** Screen 5: basket and checkout. Every amount is shown before paying. */
export default function Basket() {
  const [basket, setBasket] = useState<BasketState>(EMPTY_BASKET);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [paying, setPaying] = useState(false);
  const [fees, setFees] = useState<Fees>({ platform_fee: 0, bicycle_delivery_fee: 0, motorbike_delivery_fee: 0, transaction_fee_percent: 0 });
  const [delivery, setDelivery] = useState<"bicycle" | "motorbike">("bicycle");
  const [address, setAddress] = useState({ text: "", notes: "" });
  const [provider, setProvider] = useState<LipilaProvider>("mtn");
  const [phone, setPhone] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setOffline(false);
    withTimeout(loadBasket())
      .then((b) => {
        setBasket(b);
        setLoading(false);
      })
      .catch(async () => {
        const online = await isOnline();
        setOffline(!online);
        setLoading(false);
      });

    supabase.from("settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) {
        setFees({
          platform_fee: Number(data.platform_fee),
          bicycle_delivery_fee: Number(data.bicycle_delivery_fee),
          motorbike_delivery_fee: Number(data.motorbike_delivery_fee),
          transaction_fee_percent: Number(data.transaction_fee_percent || 0),
        });
      }
    });

    // delivery type, address and payment method: what the customer chose last, else what is saved on the account
    (async () => {
      const t = await AsyncStorage.getItem("matebeto.delivery");
      if (t === "bicycle" || t === "motorbike") setDelivery(t);
      const { details } = await loadAccount();
      const rawAddr = await AsyncStorage.getItem("matebeto.address");
      const chosen = rawAddr ? JSON.parse(rawAddr) : null;
      const saved = deliveryAddressFrom(details);
      setAddress({ text: chosen?.text || saved.text || "", notes: chosen?.notes ?? saved.notes ?? "" });
      const rawPay = await AsyncStorage.getItem("matebeto.payment");
      const pay = rawPay ? JSON.parse(rawPay) : null;
      const { data: auth } = await supabase.auth.getUser();
      setProvider((pay?.provider || details.payment_provider || "mtn") as LipilaProvider);
      setPhone(pay?.phone || details.payment_number || auth.user?.phone || "");
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function changeQty(idx: number, qty: number) {
    const items = basket.items.map((it, i) => (i === idx ? { ...it, quantity: qty } : it)).filter((it) => it.quantity > 0);
    const next = items.length ? { ...basket, items } : EMPTY_BASKET;
    setBasket(next);
    if (items.length) await saveBasket(next);
    else await clearBasket();
  }

  async function removeItem(idx: number) {
    const ok = await confirmDialog({ title: "Remove item?", message: `Remove ${basket.items[idx]?.name} from your basket?`, confirmLabel: "Remove", destructive: true });
    if (ok) changeQty(idx, 0);
  }

  async function confirmClear() {
    const ok = await confirmDialog({ title: "Clear basket?", message: "Remove everything from your basket?", confirmLabel: "Clear", destructive: true });
    if (!ok) return;
    await clearBasket();
    setBasket(EMPTY_BASKET);
  }

  const items = foodTotal(basket.items);
  const count = basket.items.reduce((n, i) => n + i.quantity, 0);
  const hasItems = basket.items.length > 0;
  const platform = hasItems ? fees.platform_fee : 0;
  const deliveryFee = hasItems ? (delivery === "bicycle" ? fees.bicycle_delivery_fee : fees.motorbike_delivery_fee) : 0;
  const txn = Math.round((items + platform + deliveryFee) * fees.transaction_fee_percent) / 100;
  const total = items + platform + deliveryFee + txn;
  const providerLabel = LIPILA_PROVIDERS.find((p) => p.id === provider)?.label || "Mobile Money";

  const sub = hasItems ? [basket.vendorName, marketShortName(basket.marketName)].filter(Boolean).join(" (") + (basket.vendorName && basket.marketName ? ")" : "") : undefined;

  return (
    <MkScreen>
      <MkHeader
        title="Your Basket"
        subtitle={sub}
        onBack={() => goBack("/(customer)")}
        right={
          hasItems ? (
            <Pressable onPress={confirmClear} hitSlop={12} accessibilityLabel="Clear basket">
              <Ionicons name="trash-outline" size={22} color={ui.ink} />
            </Pressable>
          ) : null
        }
      />
      <View style={s.hair} />
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {offline ? (
          <OfflineNotice onRetry={load} />
        ) : loading ? (
          <View style={{ paddingHorizontal: 16 }}>
            <BasketSkeleton />
          </View>
        ) : !hasItems ? (
          <EmptyState icon="basket" color={ui.red} title="Your basket is empty" />
        ) : (
          <>
            {basket.items.map((it, idx) => (
              <View key={idx}>
                <View style={s.row}>
                  <View style={s.photo}>
                    <Photo uri={it.image_url} name={it.name} height={80} width={86} hideLabel />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={s.nameRow}>
                      <Text style={s.name} numberOfLines={1}>{it.name}</Text>
                      <Pressable onPress={() => removeItem(idx)} hitSlop={10} accessibilityLabel={`Remove ${it.name}`}>
                        <Ionicons name="trash-outline" size={18} color={ui.hint} />
                      </Pressable>
                    </View>
                    <Text style={s.sides} numberOfLines={2}>{it.sides.join(", ") || "No sides"}</Text>
                    <View style={s.rowFoot}>
                      <Text style={s.price}>{kw(it.price * it.quantity)}</Text>
                      <MkStepper small value={it.quantity} min={0} onChange={(q) => changeQty(idx, q)} />
                    </View>
                    <Text style={s.unit}>Qty {it.quantity} · {kw(it.price)} each</Text>
                  </View>
                </View>
                {idx < basket.items.length - 1 ? <View style={s.rowRule} /> : null}
              </View>
            ))}

            <View style={s.sumRule} />
            <SumRow label={`Items Total (${count} ${count === 1 ? "item" : "items"})`} value={kw(items)} />
            <SumRow label="Platform Fee" value={kw(platform)} />
            <SumRow label="Delivery Fee" value="Choose rider next" />

            <View style={s.totalBand}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{kw(items + platform)}</Text>
            </View>

          </>
        )}
      </ScrollView>

      {hasItems && !loading && !offline ? (
        <View style={s.footer}>
          <RedButton label="Continue" chevron onPress={() => router.push("/(customer)/delivery")} />
        </View>
      ) : null}
    </MkScreen>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.sum}>
      <Text style={s.sumLabel}>{label}</Text>
      <Text style={s.sumValue}>{value}</Text>
    </View>
  );
}

function InfoCard({ icon, title, text, sub, onChange }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; sub?: string; onChange: () => void }) {
  return (
    <View style={s.card}>
      <Ionicons name={icon} size={24} color={ui.red} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={s.cTitle}>{title}</Text>
        <Text style={s.cText} numberOfLines={2}>{text}</Text>
        {sub ? <Text style={s.cSub}>{sub}</Text> : null}
      </View>
      <Pressable onPress={onChange} hitSlop={10}>
        <Text style={s.change}>Change</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  riderH: { fontFamily: fonts.title, fontSize: 14, color: ui.ink, marginHorizontal: 16, marginTop: 16 },
  riderRow: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 8 },
  riderChip: { flex: 1, borderWidth: 1.5, borderColor: ui.line, borderRadius: 12, paddingVertical: 10, alignItems: "center", gap: 2, backgroundColor: "#fff" },
  riderText: { fontFamily: fonts.bodySemi, fontSize: 13, color: ui.ink },
  riderFee: { fontFamily: fonts.body, fontSize: 11.5, color: ui.sub },
  hair: { height: 1, backgroundColor: ui.line },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16 },
  photo: { borderRadius: 10, overflow: "hidden" },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontFamily: fonts.title, fontSize: 15, color: ui.ink, flex: 1 },
  sides: { fontFamily: fonts.body, fontSize: 11.5, color: ui.sub, marginTop: 3 },
  rowFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  price: { fontFamily: fonts.title, fontSize: 15, color: ui.red },
  unit: { fontFamily: fonts.body, fontSize: 11, color: ui.hint, marginTop: 2 },
  rowRule: { height: 1, backgroundColor: ui.line, marginHorizontal: 16 },
  sumRule: { height: 1, backgroundColor: ui.line, marginHorizontal: 16, marginTop: 4, marginBottom: 14 },
  sum: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8 },
  sumLabel: { fontFamily: fonts.body, fontSize: 13, color: ui.ink },
  sumValue: { fontFamily: fonts.title, fontSize: 13.5, color: ui.ink },
  totalBand: { marginTop: 14, backgroundColor: ui.redSoft, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontFamily: fonts.display, fontSize: 19, color: ui.red },
  totalValue: { fontFamily: fonts.display, fontSize: 19, color: ui.red },
  card: { marginHorizontal: 16, marginTop: 14, backgroundColor: "#F8F8F9", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center" },
  cTitle: { fontFamily: fonts.title, fontSize: 14, color: ui.ink },
  cText: { fontFamily: fonts.body, fontSize: 12, color: ui.sub, marginTop: 2 },
  cSub: { fontFamily: fonts.body, fontSize: 11, color: ui.hint, marginTop: 1 },
  change: { fontFamily: fonts.bodySemi, fontSize: 12.5, color: "#1F9D55" },
  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: "#fff" },
});
