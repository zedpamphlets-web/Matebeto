import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { Photo } from "@/components/photo";
import { EmptyState } from "@/components/empty-state";
import { BasketSkeleton } from "@/components/skeleton";
import { OfflineNotice } from "@/components/offline-notice";
import { AppHeader } from "@/components/app-shell";
import { GlassSheet } from "@/components/glass-sheet";
import { clearBasket, foodTotal, loadBasket, saveBasket, type BasketState } from "@/lib/basket";
import { formatKw } from "@/lib/lipila";
import { colors, fonts, radius } from "@/lib/theme";
import { MoneyRow, PrimaryButton } from "@/components/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { isOnline, withTimeout } from "@/lib/network";

export default function Basket() {
  const [basket, setBasket] = useState<BasketState>({ marketId: null, marketName: null, items: [] });
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

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

  const total = foodTotal(basket.items);

  return (
    <View style={styles.root}>
      <Image
        source={require("../../assets/welcome-food.jpg")}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <View style={styles.dim} />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <AppHeader title="Your Basket" onMenu={() => router.push("/(customer)/menu")} />
        <GlassSheet style={{ marginTop: 4 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {offline ? (
              <OfflineNotice onRetry={load} />
            ) : loading ? (
              <BasketSkeleton />
            ) : basket.items.length === 0 ? (
              <EmptyState icon="basket" color={colors.gold} title="No basket" />
            ) : (
              <>
                {basket.marketName ? (
                  <Text style={{ color: colors.muted, marginBottom: 14, fontFamily: fonts.body }}>
                    {basket.marketName}
                  </Text>
                ) : null}
                {basket.items.map((it, idx) => (
                  <View key={idx} style={styles.row}>
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
                      <Text style={{ fontFamily: fonts.title, marginTop: 4 }}>
                        {formatKw(it.price * it.quantity)}
                      </Text>
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
                  <Text style={{ textAlign: "center", color: colors.muted, fontFamily: fonts.bodySemi }}>
                    Clear basket
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </GlassSheet>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  row: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
});
