import { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Photo } from "@/components/photo";
import { LinearGradient } from "expo-linear-gradient";
import { BackStrip, HeartButton, MkHeader, MkScreen } from "@/components/mk";
import { supabase } from "@/lib/supabase";
import { useCachedLoad } from "@/lib/offline-cache";
import { LoadingScreen } from "@/components/spinner";
import { OfflineNotice } from "@/components/offline-notice";
import { OfflineBanner } from "@/components/offline-banner";
import { fonts, ui } from "@/lib/theme";
import { kw, marketShortName } from "@/lib/format";
import { useFavourite } from "@/lib/favourites";

const W = Dimensions.get("window").width;
const PAD = 16;
const GAP = 12;
const TILE_W = (W - PAD * 2 - GAP) / 2;

export default function Market() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [opening, setOpening] = useState(false);
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
    setOpening(true);
    setTimeout(() => {
      router.push({
        pathname: "/(customer)/meal/[id]",
        params: { id: mealId, marketId: String(id), marketName: market?.name },
      });
      setTimeout(() => setOpening(false), 400);
    }, 250);
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
        <LoadingScreen />
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
                <View style={{ height: Math.round(TILE_W * 0.78), overflow: "hidden" }}>
                  <Photo uri={c.image_url} name={c.name} height={Math.round(TILE_W * 0.78)} hideLabel />
                  <LinearGradient colors={["transparent", "rgba(0,0,0,0.65)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "50%" }} />
                  <View style={{ position: "absolute", left: 8, right: 8, bottom: 8 }}>
                    <Text style={{ fontFamily: fonts.title, fontSize: 13, color: "#fff" }} numberOfLines={1}>{c.name}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          {active && shown.length === 0 ? <Text style={styles.empty}>No meals in this category yet.</Text> : null}
          {active && shown.length > 0 ? (
            <View onLayout={(e) => (listY.current = e.nativeEvent.layout.y)} style={{ marginTop: 22 }}>
              <Text style={styles.listTitle}>{categories.find((c) => c.id === active)?.name}</Text>
              {shown.map((meal, i) => (
                <Pressable
                  key={meal.id}
                  onPress={() => openMeal(meal.id)}
                  style={[styles.meal, i < shown.length - 1 && styles.mealRule]}
                >
                  <View style={{ flex: 1, paddingRight: 14 }}>
                    <Text style={styles.mealName} numberOfLines={2}>{meal.name}</Text>
                    {meal.description ? (
                      <Text numberOfLines={2} style={styles.mealDesc}>{meal.description}</Text>
                    ) : null}
                    <Text style={styles.mealPrice}>{kw(meal.price)}</Text>
                  </View>
                  <View style={styles.mealPhoto}>
                    <Photo uri={meal.image_url} name={meal.name} height={84} width={112} hideLabel />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
      <BackStrip label="Back to Markets" onPress={() => router.back()} />
    
      {opening ? (
        <View style={StyleSheet.absoluteFill}>
          <LoadingScreen />
        </View>
      ) : null}
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
  },
  tileBody: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, height: 38 },
  tileName: { fontFamily: fonts.title, fontSize: 13, color: ui.ink, flex: 1 },
  listTitle: { fontFamily: fonts.display, fontSize: 22, color: ui.ink, marginBottom: 6, letterSpacing: -0.4 },
  meal: { flexDirection: "row", alignItems: "center", paddingVertical: 16 },
  mealRule: { borderBottomWidth: 1, borderBottomColor: ui.line },
  mealPhoto: { borderRadius: 10, overflow: "hidden" },
  mealName: { fontFamily: fonts.title, fontSize: 16, color: ui.ink },
  mealDesc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: ui.sub, marginTop: 4 },
  mealPrice: { fontFamily: fonts.title, fontSize: 15, color: ui.ink, marginTop: 8 },
});
