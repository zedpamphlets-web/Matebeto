import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Photo } from "@/components/photo";
import { EmptyState } from "@/components/empty-state";
import { BasketSkeleton } from "@/components/skeleton";
import { OfflineNotice } from "@/components/offline-notice";
import { MkHeader, MkScreen, MkStepper, RedButton, goBack } from "@/components/mk";
import { clearBasket, foodTotal, loadBasket, saveBasket, type BasketState } from "@/lib/basket";
import { supabase } from "@/lib/supabase";
import { fonts, ui } from "@/lib/theme";
import { kw } from "@/lib/format";
import { foodFallback } from "@/lib/mockup-images";
import { isOnline, withTimeout } from "@/lib/network";

const ETA = "25 – 35 mins";

export default function Basket() {
  const [basket, setBasket] = useState<BasketState>({ marketId: null, marketName: null, items: [] });
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  // Starting delivery fee (bicycle). The final fee is confirmed once the delivery type is chosen.
  const [deliveryFee, setDeliveryFee] = useState(15);

  useEffect(() => {
    supabase
      .from("settings")
      .select("bicycle_delivery_fee")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.bicycle_delivery_fee != null) setDeliveryFee(Number(data.bicycle_delivery_fee));
      });
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setOffline(false);
    // Basket lives in local storage, but is wrapped with the same timeout/offline
    // handling as the network screens so every loading state behaves consistently.
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function changeQty(idx: number, qty: number) {
    const items = basket.items
      .map((it, i) => (i === idx ? { ...it, quantity: qty } : it))
      .filter((it) => it.quantity > 0);
    const next = { ...basket, items };
    setBasket(next);
    await saveBasket(next);
  }

  function confirmClear() {
    Alert.alert("Clear basket", "Remove everything from your basket?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearBasket();
          setBasket({ marketId: null, marketName: null, items: [] });
        },
      },
    ]);
  }

  const subtotal = foodTotal(basket.items);
  const count = basket.items.reduce((n, i) => n + i.quantity, 0);
  const hasItems = basket.items.length > 0;
  const total = subtotal + (hasItems ? deliveryFee : 0);

  return (
    <MkScreen edges={["top", "bottom"]}>
      <MkHeader
        title="Your Basket"
        onBack={() => goBack("/(customer)")}
        right={
          hasItems ? (
            <Pressable onPress={confirmClear} hitSlop={12} accessibilityLabel="Clear basket">
              <Ionicons name="trash-outline" size={22} color={ui.ink} />
            </Pressable>
          ) : null
        }
      />
      <View style={styles.hair} />
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {offline ? (
          <OfflineNotice onRetry={load} />
        ) : loading ? (
          <View style={{ paddingHorizontal: 16 }}>
            <BasketSkeleton />
          </View>
        ) : !hasItems ? (
          <EmptyState icon="basket" color={ui.red} title="No basket" />
        ) : (
          <>
            {basket.items.map((it, idx) => (
              <View key={idx}>
                <View style={styles.row}>
                  <View style={styles.photo}>
                    <Photo
                      uri={it.image_url}
                      name={it.name}
                      height={80}
                      width={86}
                      fallback={foodFallback(it.name)}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text style={styles.sides} numberOfLines={2}>
                      {it.sides.join(", ") || "No sides"}
                    </Text>
                    <View style={styles.rowFoot}>
                      <Text style={styles.price}>{kw(it.price * it.quantity)}</Text>
                      <MkStepper small value={it.quantity} min={0} onChange={(q) => changeQty(idx, q)} />
                    </View>
                  </View>
                </View>
                {idx < basket.items.length - 1 ? <View style={styles.rowRule} /> : null}
              </View>
            ))}

            <View style={styles.sumRule} />
            <View style={styles.sum}>
              <Text style={styles.sumLabel}>Subtotal ({count} {count === 1 ? "item" : "items"})</Text>
              <Text style={styles.sumValue}>{kw(subtotal)}</Text>
            </View>
            <View style={styles.sum}>
              <Text style={styles.sumLabel}>Delivery Fee</Text>
              <Text style={styles.sumValue}>{kw(deliveryFee)}</Text>
            </View>

            <View style={styles.totalBand}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{kw(total)}</Text>
            </View>

            <Pressable onPress={() => router.push("/(customer)/delivery")} style={styles.delivery}>
              <MaterialCommunityIcons name="moped" size={34} color={ui.red} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.dTitle}>Delivery</Text>
                <Text style={styles.dSub}>Estimated time: {ETA}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={ui.ink} />
            </Pressable>
          </>
        )}
      </ScrollView>

      {hasItems && !loading && !offline ? (
        <View style={styles.footer}>
          <RedButton
            label="Proceed to Checkout"
            icon="card-outline"
            chevron
            onPress={() => router.push("/(customer)/delivery")}
          />
        </View>
      ) : null}
    </MkScreen>
  );
}

const styles = StyleSheet.create({
  hair: { height: 1, backgroundColor: ui.line },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16 },
  photo: { borderRadius: 10, overflow: "hidden" },
  name: { fontFamily: fonts.title, fontSize: 15, color: ui.ink },
  sides: { fontFamily: fonts.body, fontSize: 11.5, color: ui.sub, marginTop: 3 },
  rowFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  price: { fontFamily: fonts.title, fontSize: 15, color: ui.red },
  rowRule: { height: 1, backgroundColor: ui.line, marginHorizontal: 16 },
  sumRule: { height: 1, backgroundColor: ui.line, marginHorizontal: 16, marginTop: 4, marginBottom: 14 },
  sum: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8 },
  sumLabel: { fontFamily: fonts.body, fontSize: 13, color: ui.ink },
  sumValue: { fontFamily: fonts.title, fontSize: 13.5, color: ui.ink },
  totalBand: {
    marginTop: 14,
    backgroundColor: ui.redSoft,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontFamily: fonts.display, fontSize: 19, color: ui.red },
  totalValue: { fontFamily: fonts.display, fontSize: 19, color: ui.red },
  delivery: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: "#F8F8F9",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  dTitle: { fontFamily: fonts.title, fontSize: 14, color: ui.ink },
  dSub: { fontFamily: fonts.body, fontSize: 11.5, color: ui.sub, marginTop: 2 },
  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, backgroundColor: "#fff" },
});
