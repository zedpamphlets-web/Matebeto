import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { clearBasket, foodTotal, loadBasket, saveBasket, type BasketState } from "@/lib/basket";
import { formatKw } from "@/lib/lipila";
import { colors, radius } from "@/lib/theme";
import { PrimaryButton } from "@/components/ui";

export default function Basket() {
  const [basket, setBasket] = useState<BasketState>({ marketId: null, marketName: null, items: [] });

  useFocusEffect(
    useCallback(() => {
      loadBasket().then(setBasket);
    }, [])
  );

  async function changeQty(idx: number, delta: number) {
    const items = basket.items.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it));
    const next = { ...basket, items };
    setBasket(next);
    await saveBasket(next);
  }

  const total = foodTotal(basket.items);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={{ fontSize: 26, fontWeight: "800" }}>Your basket</Text>
      <Text style={{ color: colors.muted, marginBottom: 16 }}>{basket.marketName || "No market selected"}</Text>
      {basket.items.length === 0 ? (
        <Text style={{ color: colors.muted }}>Your basket is empty.</Text>
      ) : (
        basket.items.map((it, idx) => (
          <View key={idx} style={{ flexDirection: "row", backgroundColor: "#fff", borderRadius: radius.md, padding: 12, marginBottom: 10 }}>
            <Image source={{ uri: it.image_url }} style={{ width: 64, height: 64, borderRadius: 10 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontWeight: "800" }}>{it.quantity} × {it.name}</Text>
              <Text style={{ color: colors.muted }}>{it.sides.join(", ") || "No sides"}</Text>
              <Text style={{ fontWeight: "800", marginTop: 4 }}>{formatKw(it.price * it.quantity)}</Text>
            </View>
            <View>
              <Pressable onPress={() => changeQty(idx, 1)}><Text style={{ fontSize: 20 }}>+</Text></Pressable>
              <Pressable onPress={() => changeQty(idx, -1)}><Text style={{ fontSize: 20 }}>-</Text></Pressable>
            </View>
          </View>
        ))
      )}
      {basket.items.length > 0 && (
        <>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 12 }}>
            <Text style={{ fontWeight: "700" }}>Food total</Text>
            <Text style={{ fontWeight: "800" }}>{formatKw(total)}</Text>
          </View>
          <PrimaryButton label="Continue" onPress={() => router.push("/(customer)/delivery")} />
          <Pressable onPress={async () => { await clearBasket(); setBasket({ marketId: null, marketName: null, items: [] }); }} style={{ marginTop: 14 }}>
            <Text style={{ textAlign: "center", color: colors.muted }}>Clear basket</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
