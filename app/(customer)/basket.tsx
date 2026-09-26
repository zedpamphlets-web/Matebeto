import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Photo } from "@/components/photo";
import { AppHeader, DarkScreen, GoldButton } from "@/components/app-shell";
import { clearBasket, foodTotal, loadBasket, saveBasket, type BasketState } from "@/lib/basket";
import { formatKw } from "@/lib/lipila";
import { colors, fonts, radius } from "@/lib/theme";

export default function Basket() {
  const [basket, setBasket] = useState<BasketState>({ marketId: null, marketName: null, items: [] });

  useFocusEffect(
    useCallback(() => {
      loadBasket().then(setBasket);
    }, [])
  );

  async function changeQty(idx: number, qty: number) {
    const items = basket.items
      .map((it, i) => (i === idx ? { ...it, quantity: qty } : it))
      .filter((it) => it.quantity > 0);
    const next = { ...basket, items };
    setBasket(next);
    await saveBasket(next);
  }

  const total = foodTotal(basket.items);

  return (
    <DarkScreen>
      <AppHeader title="Your Basket" onMenu={() => router.push("/(customer)/menu")} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={{ color: "#8A8A8A", marginBottom: 16, fontFamily: fonts.body }}>
          {basket.marketName || "Shop a market to add meals"}
        </Text>
        {basket.items.length === 0 ? (
          <Text style={{ color: "#8A8A8A", fontFamily: fonts.body }}>Your basket is empty.</Text>
        ) : (
          basket.items.map((it, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                backgroundColor: "#141414",
                borderRadius: radius.md,
                padding: 12,
                marginBottom: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <View style={{ borderRadius: 12, overflow: "hidden" }}>
                <Photo uri={it.image_url} name={it.name} height={64} width={64} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontFamily: fonts.title, color: "#fff" }}>
                  {it.quantity} × {it.name}
                </Text>
                <Text style={{ color: "#8A8A8A", fontFamily: fonts.body, fontSize: 12 }}>
                  {it.sides.join(", ") || "No sides"}
                </Text>
                <Text style={{ fontFamily: fonts.title, marginTop: 4, color: colors.gold }}>
                  {formatKw(it.price * it.quantity)}
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Pressable onPress={() => changeQty(idx, it.quantity + 1)}>
                  <Text style={{ fontSize: 22, fontFamily: fonts.title, color: "#fff" }}>+</Text>
                </Pressable>
                <Text style={{ fontFamily: fonts.title, color: "#fff" }}>{it.quantity}</Text>
                <Pressable onPress={() => changeQty(idx, it.quantity - 1)}>
                  <Text style={{ fontSize: 22, fontFamily: fonts.title, color: "#fff" }}>−</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
        {basket.items.length > 0 && (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, marginBottom: 16 }}>
              <Text style={{ color: "#fff", fontFamily: fonts.display, fontSize: 18 }}>Food Total</Text>
              <Text style={{ color: colors.gold, fontFamily: fonts.display, fontSize: 18 }}>{formatKw(total)}</Text>
            </View>
            <GoldButton label="Continue" onPress={() => router.push("/(customer)/delivery")} />
            <Pressable
              onPress={async () => {
                await clearBasket();
                setBasket({ marketId: null, marketName: null, items: [] });
              }}
              style={{ marginTop: 14 }}
            >
              <Text style={{ textAlign: "center", color: "#8A8A8A", fontFamily: fonts.bodySemi }}>Clear basket</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </DarkScreen>
  );
}
