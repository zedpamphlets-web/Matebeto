import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Photo } from "@/components/photo";
import { EmptyState } from "@/components/empty-state";
import { AppHeader } from "@/components/app-shell";
import { clearBasket, foodTotal, loadBasket, saveBasket, type BasketState } from "@/lib/basket";
import { formatKw } from "@/lib/lipila";
import { colors, fonts, radius } from "@/lib/theme";
import { MoneyRow, PrimaryButton } from "@/components/ui";
import { SafeAreaView } from "react-native-safe-area-context";

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
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <AppHeader title="Your Basket" onMenu={() => router.push("/(customer)/menu")} />
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.97)",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }}
        >
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {basket.items.length === 0 ? (
              <EmptyState
                icon="basket"
                color={colors.gold}
                title="No basket"
                hint="Pick a market, add a meal, and your basket will show here."
              />
            ) : (
              <>
                <Text style={{ color: colors.muted, marginBottom: 16, fontFamily: fonts.body }}>
                  {basket.marketName || "Your market"}
                </Text>
                {basket.items.map((it, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      backgroundColor: "#fff",
                      borderRadius: radius.md,
                      padding: 12,
                      marginBottom: 10,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: colors.line,
                    }}
                  >
                    <View style={{ borderRadius: 12, overflow: "hidden" }}>
                      <Photo uri={it.image_url} name={it.name} height={64} width={64} />
                    </View>
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
                ))}
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
        </View>
      </SafeAreaView>
    </View>
  );
}
