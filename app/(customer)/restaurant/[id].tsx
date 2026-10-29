import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Photo } from "@/components/photo";
import { EmptyState } from "@/components/empty-state";
import { HeartButton, MkHeader, MkScreen } from "@/components/mk";
import { LoadingScreen } from "@/components/spinner";
import { OfflineNotice } from "@/components/offline-notice";
import { OfflineBanner } from "@/components/offline-banner";
import { supabase } from "@/lib/supabase";
import { useCachedLoad } from "@/lib/offline-cache";
import { useFavourite } from "@/lib/favourites";
import { loadRestaurantMenu, loadRestaurants, NSHIMA_LINE, standLabel, type MenuMeal, type Restaurant } from "@/lib/restaurants";
import { kwShort, marketShortName } from "@/lib/format";
import { Dimensions } from "react-native";
import { fonts, ui } from "@/lib/theme";

const W = Dimensions.get("window").width;
const PAD = 16;
const GAP = 12;
const TILE_W = (W - PAD * 2 - GAP) / 2;

/** Screen 3: one restaurant's own menu and prices. */
export default function RestaurantMenu() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const restQ = useCachedLoad<Restaurant[]>("restaurants.all", () => loadRestaurants(null));
  const menuQ = useCachedLoad<MenuMeal[]>(`restaurant.${id}.menu`, () => loadRestaurantMenu(String(id)));
  const rest = (restQ.data || []).find((r) => r.id === id);
  const [market, setMarket] = useState<any>(null);
  useEffect(() => {
    if (!rest?.market_id) return;
    supabase.from("markets").select("id,name").eq("id", rest.market_id).maybeSingle().then(({ data }) => setMarket(data));
  }, [rest?.market_id]);
  const meals = menuQ.data || [];
  const fav = useFavourite("restaurant", id);

  const loading = restQ.loading || menuQ.loading;
  const failed = restQ.failed && menuQ.failed;

  function openMeal(m: MenuMeal) {
    router.push({
      pathname: "/(customer)/meal/[id]",
      params: { id: m.meal_id, vendorId: String(id), vendorName: rest?.name || "", marketId: rest?.market_id || "", marketName: market?.name || "" },
    });
  }

  return (
    <MkScreen>
      <MkHeader
        title={rest?.name || "Restaurant"}
        subtitle={[standLabel(rest?.stand_number), marketShortName(market?.name)].filter(Boolean).join(" · ")}
        right={<HeartButton on={fav.on} onPress={fav.toggle} />}
      />
      {failed ? (
        <OfflineNotice onRetry={() => { restQ.reload(); menuQ.reload(); }} />
      ) : loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {restQ.stale || menuQ.stale ? <OfflineBanner /> : null}
          <Photo uri={rest?.image_url} name={rest?.name} height={150} hideLabel />
          <View style={{ paddingHorizontal: PAD }}>
            {rest?.description ? <Text style={s.desc}>{rest.description}</Text> : null}
            <View style={s.chips}>
              {rest?.rating ? (
                <View style={s.chip}>
                  <Ionicons name="star" size={13} color={ui.amber} />
                  <Text style={s.chipText}>
                    {Number(rest.rating).toFixed(1)}
                    {rest.rating_count ? ` (${rest.rating_count})` : ""}
                  </Text>
                </View>
              ) : null}
              {rest?.cuisine ? (
                <View style={s.chip}>
                  <Ionicons name="restaurant-outline" size={13} color={ui.sub} />
                  <Text style={s.chipText}>{rest.cuisine}</Text>
                </View>
              ) : null}
              <View style={s.chip}>
                <View style={[s.dot, { backgroundColor: rest?.is_open === false ? ui.hint : "#1F9D55" }]} />
                <Text style={s.chipText}>{rest?.is_open === false ? "Closed" : "Open"}</Text>
              </View>
            </View>

            <Text style={s.h}>Our Meals</Text>
            {meals.length === 0 ? <Text style={s.empty}>No meals on the menu yet.</Text> : null}
            <View style={s.grid}>
              {meals.map((m) => (
                <Pressable key={m.meal_id} onPress={() => openMeal(m)} style={s.tile}>
                  <Photo uri={m.image_url} name={m.name} height={Math.round(TILE_W * 0.72)} hideLabel />
                  <View style={s.tileBody}>
                    <Text style={s.mealName} numberOfLines={1}>{m.name}</Text>
                    <Text style={s.mealDesc} numberOfLines={2}>{NSHIMA_LINE}</Text>
                    <View style={s.priceRow}>
                      <Text style={s.price}>{kwShort(m.price)}</Text>
                      <Ionicons name="chevron-forward" size={15} color={ui.ink} />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </MkScreen>
  );
}

const s = StyleSheet.create({
  desc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: ui.sub, marginTop: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: ui.field, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6 },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12, color: ui.ink },
  dot: { width: 8, height: 8, borderRadius: 4 },
  h: { fontFamily: fonts.title, fontSize: 17, color: ui.ink, marginTop: 20, marginBottom: 12 },
  empty: { fontFamily: fonts.body, color: ui.sub },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: { width: TILE_W, backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: ui.line },
  tileBody: { padding: 10 },
  mealName: { fontFamily: fonts.title, fontSize: 14, color: ui.ink },
  mealDesc: { fontFamily: fonts.body, fontSize: 10.5, lineHeight: 14, color: ui.sub, marginTop: 3 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  price: { fontFamily: fonts.title, fontSize: 15, color: ui.red },
});
