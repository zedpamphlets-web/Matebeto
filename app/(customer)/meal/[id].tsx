import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useCachedLoad } from "@/lib/offline-cache";
import { DetailSkeleton } from "@/components/skeleton";
import { OfflineNotice } from "@/components/offline-notice";
import { loadBasket, saveBasket } from "@/lib/basket";
import { fonts, ui } from "@/lib/theme";
import { kw } from "@/lib/format";
import { useFavourite } from "@/lib/favourites";
import { Photo } from "@/components/photo";
import { Checkbox, HeartButton, MkHeader, MkScreen, MkStepper, RedButton } from "@/components/mk";

const DEFAULT_PREP = "15 – 20 minutes";

export default function MealDetail() {
  const { id, marketId, marketName, vendorId, vendorName } = useLocalSearchParams<{
    id: string;
    marketId?: string;
    marketName?: string;
    vendorId?: string;
    vendorName?: string;
  }>();
  const [selected, setSelected] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [shownRestaurant, setShownRestaurant] = useState<string | null>(null);

  const mealQ = useCachedLoad<any>(`meal.${id}`, () =>
    supabase.from("meals").select("*").eq("id", id).maybeSingle()
  );
  const sidesQ = useCachedLoad<any[]>(`meal.${id}.sides`, () =>
    supabase.from("meal_sides").select("name").eq("meal_id", id)
  );
  const meal = mealQ.data;
  const sides: string[] = (sidesQ.data || []).map((s: any) => s.name);
  const fav = useFavourite("meal", id);

  const sidesKey = sides.join("|");
  useEffect(() => {
    setSelected(sides);
  }, [sidesKey]);

  useEffect(() => {
    const clean = (v: any) => (v && v !== "null" && v !== "undefined" ? String(v) : null);
    const fromRoute = clean(vendorName) || clean(marketName);
    if (fromRoute) {
      setShownRestaurant(fromRoute);
      return;
    }
    loadBasket().then((b) => setShownRestaurant(clean(b.vendorName) || clean(b.marketName)));
  }, [vendorName, marketName]);

  async function add() {
    if (!meal) return;
    const basket = await loadBasket();
    const clean = (v: any) => (v && v !== "null" && v !== "undefined" ? String(v) : null);
    const mk = clean(marketId) || clean(basket.marketId);
    const vid = clean(vendorId) || clean(basket.vendorId);
    if (!mk) {
      Alert.alert(
        "Choose your market",
        "Pick a market first, then choose a restaurant and meal."
      );
      router.push("/(customer)/");
      return;
    }
    // One restaurant per order
    if (
      clean(basket.vendorId) &&
      clean(vendorId) &&
      clean(basket.vendorId) !== clean(vendorId) &&
      basket.items.length
    ) {
      Alert.alert(
        "One restaurant per order",
        "Clear the basket to order from a different restaurant."
      );
      return;
    }
    // Fallback: one market if no vendor yet
    if (
      !clean(vendorId) &&
      clean(basket.marketId) &&
      clean(marketId) &&
      clean(basket.marketId) !== clean(marketId) &&
      basket.items.length
    ) {
      Alert.alert("One market per order", "Clear the basket to order from a different market.");
      return;
    }
    const existing = basket.items.find(
      (i) => i.meal_id === meal.id && i.sides.join() === selected.join()
    );
    const items = existing
      ? basket.items.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + qty } : i
        )
      : [
          ...basket.items,
          {
            meal_id: meal.id,
            name: meal.name,
            price: Number(meal.price),
            quantity: qty,
            sides: selected,
            image_url: meal.image_url,
          },
        ];
    await saveBasket({
      marketId: mk,
      marketName: clean(marketName) || basket.marketName || null,
      vendorId: vid,
      vendorName: clean(vendorName) || basket.vendorName || null,
      items,
    });
    setAdded(true);
  }

  if (mealQ.failed) {
    return (
      <MkScreen>
        <MkHeader title="Meal" />
        <OfflineNotice onRetry={mealQ.reload} />
      </MkScreen>
    );
  }
  if (mealQ.loading || !meal) {
    return (
      <MkScreen>
        <MkHeader title="Meal" />
        <DetailSkeleton />
      </MkScreen>
    );
  }

  const subtotal = Number(meal.price) * qty;

  return (
    <MkScreen edges={["top", "bottom"]}>
      <MkHeader title={meal.name} right={<HeartButton on={fav.on} onPress={fav.toggle} />} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Photo uri={meal.image_url} name={meal.name} height={180} />
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.name}>{meal.name}</Text>
          <Text style={styles.price}>{kw(meal.price)}</Text>
        </View>
        <Text style={styles.desc}>
          {meal.description || "Prepared and served with nshima."}
        </Text>

        {sides.length > 0 ? (
          <>
            <View style={styles.rule} />
            <Text style={styles.h}>
              Choose your sides{" "}
              <Text style={styles.hint}>(No extra charge)</Text>
            </Text>
            {sides.map((s) => {
              const on = selected.includes(s);
              return (
                <Pressable
                  key={s}
                  onPress={() =>
                    setSelected((cur) =>
                      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
                    )
                  }
                  style={styles.sideRow}
                >
                  <Checkbox on={on} />
                  <Text style={styles.sideText}>{s}</Text>
                </Pressable>
              );
            })}
          </>
        ) : null}

        <View style={styles.rule} />
        <Text style={styles.h}>Quantity</Text>
        <View style={{ marginTop: 8 }}>
          <MkStepper value={qty} onChange={setQty} />
        </View>
        <Text style={styles.subtotal}>Total {kw(subtotal)}</Text>

        {shownRestaurant ? (
          <Text style={styles.available}>From {shownRestaurant}</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {!added ? (
          <RedButton label="Add to Order" icon="bag-handle-outline" onPress={add} />
        ) : (
          <>
            <Text style={styles.confirm}>Added to your order</Text>
            <RedButton
              label="Continue to Checkout"
              icon="arrow-forward"
              onPress={() => router.push("/(customer)/basket")}
            />
            <Pressable
              onPress={() => {
                setAdded(false);
                if (vendorId) {
                  router.replace({
                    pathname: "/(customer)/restaurant/[id]",
                    params: {
                      id: String(vendorId),
                      marketId: String(marketId || ""),
                      marketName: String(marketName || ""),
                    },
                  });
                } else {
                  router.back();
                }
              }}
              style={styles.secondaryBtn}
            >
              <Ionicons name="arrow-back" size={17} color={ui.red} />
              <Text style={styles.secondaryText}>Continue Shopping</Text>
            </Pressable>
          </>
        )}
      </View>
    </MkScreen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 12, overflow: "hidden" },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 14,
    gap: 12,
  },
  name: { fontFamily: fonts.display, fontSize: 21, color: ui.ink, flex: 1 },
  price: { fontFamily: fonts.display, fontSize: 18, color: ui.red },
  desc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 19,
    color: ui.sub,
    marginTop: 8,
  },
  rule: { height: 1, backgroundColor: ui.line, marginVertical: 14 },
  h: { fontFamily: fonts.title, fontSize: 15, color: ui.ink, marginBottom: 6 },
  hint: { fontFamily: fonts.body, fontSize: 11.5, color: ui.hint },
  sideRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  sideText: { fontFamily: fonts.body, fontSize: 14, color: ui.ink, marginLeft: 14 },
  subtotal: {
    fontFamily: fonts.title,
    fontSize: 16,
    color: ui.ink,
    marginTop: 14,
  },
  available: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: ui.sub,
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: ui.line,
    gap: 8,
  },
  confirm: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: "#1F9D55",
    textAlign: "center",
    marginBottom: 2,
  },
  secondaryBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryText: { fontFamily: fonts.title, fontSize: 14, color: ui.red },
});
