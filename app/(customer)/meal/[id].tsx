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
import { kw, marketLabel } from "@/lib/format";
import { useFavourite } from "@/lib/favourites";
import { mealHeroFallback } from "@/lib/mockup-images";
import { Photo } from "@/components/photo";
import { Checkbox, HeartButton, MkHeader, MkScreen, MkStepper, RedButton } from "@/components/mk";

const DEFAULT_PREP = "15 – 20 minutes";

export default function MealDetail() {
  const { id, marketId, marketName } = useLocalSearchParams<{ id: string; marketId?: string; marketName?: string }>();
  const [selected, setSelected] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [shownMarket, setShownMarket] = useState<string | null>(null);

  const mealQ = useCachedLoad<any>(`meal.${id}`, () => supabase.from("meals").select("*").eq("id", id).maybeSingle());
  const sidesQ = useCachedLoad<any[]>(`meal.${id}.sides`, () => supabase.from("meal_sides").select("name").eq("meal_id", id));
  const meal = mealQ.data;
  const sides: string[] = (sidesQ.data || []).map((s: any) => s.name);
  const fav = useFavourite("meal", id);

  // included sides start ticked, as before, once they load
  const sidesKey = sides.join("|");
  useEffect(() => {
    setSelected(sides);
  }, [sidesKey]);

  // "Available at": the market this meal was opened from, or the one already in the basket
  useEffect(() => {
    const clean = (v: any) => (v && v !== "null" && v !== "undefined" ? String(v) : null);
    const fromRoute = clean(marketName);
    if (fromRoute) {
      setShownMarket(fromRoute);
      return;
    }
    loadBasket().then((b) => setShownMarket(clean(b.marketName)));
  }, [marketName]);

  async function add() {
    if (!meal) return;
    const basket = await loadBasket();
    const clean = (v: any) => (v && v !== "null" && v !== "undefined" ? String(v) : null);
    const mk = clean(marketId) || clean(basket.marketId);
    if (!mk) {
      Alert.alert("Choose your market", "Pick Thornpark, Longacres or Olympia first, then add this meal from there.");
      router.push("/(customer)/markets");
      return;
    }
    if (clean(basket.marketId) && clean(marketId) && clean(basket.marketId) !== clean(marketId) && basket.items.length) {
      Alert.alert("One market per order", "Clear the basket to order from a different market.");
      return;
    }
    const existing = basket.items.find((i) => i.meal_id === meal.id && i.sides.join() === selected.join());
    const items = existing
      ? basket.items.map((i) => (i === existing ? { ...i, quantity: i.quantity + qty } : i))
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
      items,
    });
    router.push("/(customer)/basket");
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

  const extrasText = `Main meal + ${selected.length} extra${selected.length === 1 ? "" : "s"} (as selected)`;

  return (
    <MkScreen edges={["top", "bottom"]}>
      <MkHeader title={meal.name} right={<HeartButton on={fav.on} onPress={fav.toggle} />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Photo uri={meal.image_url} name={meal.name} height={150} fallback={mealHeroFallback(meal.name)} />
        </View>

        <Text style={styles.name}>{meal.name}</Text>
        <Text style={styles.price}>{kw(meal.price)}</Text>
        {meal.description ? <Text style={styles.desc}>{meal.description}</Text> : null}

        {sides.length > 0 ? (
          <>
            <View style={styles.rule} />
            <Text style={styles.h}>
              Choose Extras <Text style={styles.hint}>(Tick what you want)</Text>
            </Text>
            {sides.map((s) => {
              const on = selected.includes(s);
              return (
                <Pressable
                  key={s}
                  onPress={() => setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
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
        <InfoRow icon="restaurant" title="Includes" text={extrasText} />
        <InfoRow icon="time-outline" title="Preparation Time" text={meal.prep_time || DEFAULT_PREP} />
        {shownMarket ? <InfoRow icon="location-sharp" title="Available at" text={marketLabel(shownMarket)} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buyRow}>
          <MkStepper value={qty} onChange={setQty} />
          <RedButton label="Add to Basket" icon="bag-handle-outline" onPress={add} style={{ flex: 1 }} />
        </View>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={17} color={ui.red} />
          <Text style={styles.backText}>Back to Menu</Text>
        </Pressable>
      </View>
    </MkScreen>
  );
}

function InfoRow({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return (
    <View style={styles.info}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={20} color={ui.red} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 12, overflow: "hidden" },
  name: { fontFamily: fonts.display, fontSize: 21, color: ui.ink, marginTop: 14 },
  price: { fontFamily: fonts.display, fontSize: 18, color: ui.red, marginTop: 3 },
  desc: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19, color: ui.sub, marginTop: 8 },
  rule: { height: 1, backgroundColor: ui.line, marginVertical: 14 },
  h: { fontFamily: fonts.title, fontSize: 15, color: ui.ink, marginBottom: 6 },
  hint: { fontFamily: fonts.body, fontSize: 11.5, color: ui.hint },
  sideRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  sideText: { fontFamily: fonts.body, fontSize: 14, color: ui.ink, marginLeft: 14 },
  info: { flexDirection: "row", alignItems: "center", paddingVertical: 7 },
  infoIcon: { width: 40, alignItems: "flex-start" },
  infoTitle: { fontFamily: fonts.bodySemi, fontSize: 13, color: ui.ink },
  infoText: { fontFamily: fonts.body, fontSize: 11.5, color: ui.sub, marginTop: 1 },
  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: ui.line },
  buyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: {
    marginTop: 10,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  backText: { fontFamily: fonts.title, fontSize: 14, color: ui.red },
});
