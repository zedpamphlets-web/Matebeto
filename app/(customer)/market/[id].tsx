import { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Photo } from "@/components/photo";
import { BackStrip, HeartButton, MkHeader, MkScreen } from "@/components/mk";
import { supabase } from "@/lib/supabase";
import { useCachedLoad } from "@/lib/offline-cache";
import { CategoriesSkeleton } from "@/components/skeleton";
import { OfflineNotice } from "@/components/offline-notice";
import { OfflineBanner } from "@/components/offline-banner";
import { fonts, ui } from "@/lib/theme";
import { kw, marketShortName } from "@/lib/format";
import { useFavourite } from "@/lib/favourites";
import { foodFallback, marketBannerFallback } from "@/lib/mockup-images";

const W = Dimensions.get("window").width;
const PAD = 16;
const GAP = 12;
const TILE_W = (W - PAD * 2 - GAP) / 2;

export default function Market() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [active, setActive] = useState<string | null>(null);
  const scroller = useRef<ScrollView>(null);
  const listY = useRef(0);

  const marketQ = useCachedLoad<any>(`market.${id}`, () =>
    supabase.from("markets").select("*").eq("id", id).maybeSingle()
  );
  const catsQ = useCachedLoad<any[]>("categories.all", () =>
    supabase.from("categories").select("*").order("sort_order")
  );
  const mealsQ = useCachedLoad<any[]>("meals.available", () =>
    supabase.from("meals").select("*").eq("is_available", true)
  );
  const market = marketQ.data;
  const categories = catsQ.data || [];
  const meals = mealsQ.data || [];
  const loading = catsQ.loading || mealsQ.loading;
  const failed = catsQ.failed && mealsQ.failed;
  const stale = catsQ.stale || mealsQ.stale;
  const fav = useFavourite("market", id);
  const name = marketShortName(market?.name);

  const retry = () => {
    marketQ.reload();
    catsQ.reload();
    mealsQ.reload();
  };

  const shown = active ? meals.filter((m) => m.category_id === active) : [];

  function openMeal(mealId: string) {
    router.push({
      pathname: "/(customer)/meal/[id]",
      params: { id: mealId, marketId: String(id), marketName: market?.name },
    });
  }

  // A category with a single meal opens that meal straight away; otherwise its meals are listed below.
  function pickCategory(catId: string) {
    const inCat = meals.filter((m) => m.category_id === catId);
    if (inCat.length === 1) {
      openMeal(inCat[0].id);
      return;
    }
    setActive(catId);
  }

  useEffect(() => {
    if (active) setTimeout(() => scroller.current?.scrollTo({ y: Math.max(0, listY.current - 12), animated: true }), 80);
  }, [active]);

  return (
    <MkScreen>
      <MkHeader
        title={name || "Market"}
        subtitle="Food Market"
        right={<HeartButton on={fav.on} onPress={fav.toggle} />}
      />
      {failed ? (
        <OfflineNotice onRetry={retry} />
      ) : loading ? (
        <CategoriesSkeleton />
      ) : (
        <ScrollView
          ref={scroller}
          contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {stale ? <OfflineBanner /> : null}
          <View style={styles.banner}>
            <Photo
              uri={market?.image_url}
              name={market?.name}
              height={104}
              fallback={marketBannerFallback(market?.name)}
            />
          </View>

          <Text style={styles.h}>Our Menu</Text>
          <Text style={styles.sub}>Freshly prepared meals from {name || "this market"}.</Text>

          {categories.length === 0 ? <Text style={styles.empty}>No categories yet.</Text> : null}
          <View style={styles.grid}>
            {categories.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => pickCategory(c.id)}
                style={[styles.tile, active === c.id && { borderColor: ui.red }]}
              >
                <Photo uri={c.image_url} name={c.name} height={Math.round(TILE_W * 0.62)} fallback={foodFallback(c.name)} />
                <View style={styles.tileBody}>
                  <Text style={styles.tileName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={ui.ink} />
                </View>
              </Pressable>
            ))}
          </View>

          {active && shown.length === 0 ? <Text style={styles.empty}>No meals in this category yet.</Text> : null}
          {active && shown.length > 0 ? (
            <View onLayout={(e) => (listY.current = e.nativeEvent.layout.y)} style={{ marginTop: 20 }}>
              {shown.map((meal) => (
                <Pressable key={meal.id} onPress={() => openMeal(meal.id)} style={styles.meal}>
                  <View style={styles.mealPhoto}>
                    <Photo
                      uri={meal.image_url}
                      name={meal.name}
                      height={84}
                      width={84}
                      fallback={foodFallback(meal.name)}
                    />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    {meal.description ? (
                      <Text numberOfLines={2} style={styles.mealDesc}>
                        {meal.description}
                      </Text>
                    ) : null}
                    <Text style={styles.mealPrice}>{kw(meal.price)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={ui.ink} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
      <BackStrip label="Back to Markets" onPress={() => router.back()} />
    </MkScreen>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 12, overflow: "hidden" },
  h: { fontFamily: fonts.title, fontSize: 18, color: ui.ink, marginTop: 18 },
  sub: { fontFamily: fonts.body, fontSize: 12, color: ui.sub, marginTop: 3, marginBottom: 14 },
  empty: { fontFamily: fonts.body, color: ui.sub, marginTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: {
    width: TILE_W,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: ui.line,
    shadowColor: "#1C1B26",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  tileBody: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, height: 38 },
  tileName: { fontFamily: fonts.title, fontSize: 13, color: ui.ink, flex: 1 },
  meal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.line,
    padding: 10,
    marginBottom: 10,
  },
  mealPhoto: { borderRadius: 10, overflow: "hidden" },
  mealName: { fontFamily: fonts.title, fontSize: 14, color: ui.ink },
  mealDesc: { fontFamily: fonts.body, fontSize: 11.5, color: ui.sub, marginTop: 3 },
  mealPrice: { fontFamily: fonts.title, fontSize: 14, color: ui.red, marginTop: 5 },
});
