import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Photo } from "@/components/photo";
import { clearBasket, foodTotal, loadBasket, saveBasket, type BasketState } from "@/lib/basket";
import { formatKw } from "@/lib/lipila";
import { colors, fonts, radius } from "@/lib/theme";
import { MoneyRow, PrimaryButton } from "@/components/ui";

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
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={{ color: colors.muted, marginBottom: 16, fontFamily: fonts.body }}>
        {basket.marketName || "Shop a market to add meals"}
      </Text>
      {basket.items.length === 0 ? (
        <Text style={{ color: colors.muted, fontFamily: fonts.body }}>Your basket is empty.</Text>
      ) : (
        basket.items.map((it, idx) => (
          <View
            key={idx}
            style={{
              flexDirection: "row",
              backgroundColor: "#fff",
              borderRadius: radius.md,
              padding: 12,
              marginBottom: 10,
              alignItems: "center",
            }}
          >
            <Photo uri={it.image_url} name={it.name} height={64} width={64} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontFamily: fonts.title }}>
                {it.quantity} × {it.name}
              </Text>
              <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12 }}>
                {it.sides.join(", ") || "No sides"}
              </Text>
              <Text style={{ fontFamily: fonts.title, marginTop: 4 }}>{formatKw(it.price * it.quantity)}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Pressable onPress={() => changeQty(idx, it.quantity + 1)}>
                <Text style={{ fontSize: 22, fontFamily: fonts.title }}>+</Text>
              </Pressable>
              <Text style={{ fontFamily: fonts.title }}>{it.quantity}</Text>
              <Pressable onPress={() => changeQty(idx, it.quantity - 1)}>
                <Text style={{ fontSize: 22, fontFamily: fonts.title }}>−</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
      {basket.items.length > 0 && (
        <>
          <MoneyRow label="Food Total" value={formatKw(total)} bold />
          <View style={{ height: 16 }} />
          <PrimaryButton label="Continue" onPress={() => router.push("/(customer)/delivery")} />
          <Pressable
            onPress={async () => {
              await clearBasket();
              setBasket({ marketId: null, marketName: null, items: [] });
            }}
            style={{ marginTop: 14 }}
          >
            <Text style={{ textAlign: "center", color: colors.muted, fontFamily: fonts.bodySemi }}>Clear basket</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
