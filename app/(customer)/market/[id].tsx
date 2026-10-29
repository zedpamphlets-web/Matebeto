import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Photo } from "@/components/photo";
import { EmptyState } from "@/components/empty-state";
import { MkHeader, MkScreen } from "@/components/mk";
import { LoadingScreen } from "@/components/spinner";
import { OfflineNotice } from "@/components/offline-notice";
import { OfflineBanner } from "@/components/offline-banner";
import { supabase } from "@/lib/supabase";
import { useCachedLoad } from "@/lib/offline-cache";
import { loadRestaurants, standLabel, type Restaurant } from "@/lib/restaurants";
import { marketDistanceKm, useCoords } from "@/lib/location";
import { countLabel, distanceText, marketShortName } from "@/lib/format";
import { fonts, ui } from "@/lib/theme";

/** Screen 2: restaurants in the chosen market. No search: customers browse the list. */
export default function Market() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useCoords();

  const marketQ = useCachedLoad<any>(`market.${id}`, () =>
    supabase.from("markets").select("*").eq("id", id).maybeSingle()
  );
  const listQ = useCachedLoad<Restaurant[]>(`restaurants.${id}`, () => loadRestaurants(String(id)));
  const market = marketQ.data;
  const list = listQ.data || [];
  const name = marketShortName(market?.name);
  const km = distanceText(marketDistanceKm(market, me));

  const retry = () => {
    marketQ.reload();
    listQ.reload();
  };

  return (
    <MkScreen>
      <MkHeader title="Restaurants" />
      {listQ.failed ? (
        <OfflineNotice onRetry={retry} />
      ) : listQ.loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {listQ.stale ? <OfflineBanner /> : null}

          <View style={s.banner}>
            <Photo uri={market?.image_url} name={market?.name} height={112} hideLabel />
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={StyleSheet.absoluteFill} />
            <View style={s.bannerText}>
              <Text style={s.bannerName}>{name || "Market"}</Text>
              <Text style={s.bannerSub}>
                {countLabel(list.length, "restaurant", "restaurants")}
                {km ? `  ·  ${km}` : ""}
              </Text>
            </View>
          </View>

          {list.length === 0 ? (
            <EmptyState icon="restaurant" color={ui.red} title="No restaurants here yet" />
          ) : (
            list.map((r, i) => (
              <Pressable
                key={r.id}
                onPress={() => router.push({ pathname: "/(customer)/restaurant/[id]", params: { id: r.id } })}
                style={[s.row, i < list.length - 1 && s.rule]}
              >
                <View style={s.photo}>
                  <Photo uri={r.image_url} name={r.name} height={78} width={78} hideLabel />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{r.name}</Text>
                  <Text style={s.meta} numberOfLines={1}>
                    {[standLabel(r.stand_number), km].filter(Boolean).join("  ·  ") || name}
                  </Text>
                  <View style={s.line}>
                    {r.rating ? (
                      <>
                        <Ionicons name="star" size={12} color={ui.amber} />
                        <Text style={s.rating}>
                          {Number(r.rating).toFixed(1)}
                          {r.rating_count ? ` (${r.rating_count})` : ""}
                        </Text>
                      </>
                    ) : null}
                    {r.cuisine ? <Text style={s.meta}>{r.rating ? "  ·  " : ""}{r.cuisine}</Text> : null}
                  </View>
                  <View style={s.line}>
                    <View style={[s.dot, { backgroundColor: r.is_open ? "#1F9D55" : ui.hint }]} />
                    <Text style={[s.meta, { color: r.is_open ? "#1F9D55" : ui.hint }]}>{r.is_open ? "Open" : "Closed"}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={ui.hint} />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </MkScreen>
  );
}

const s = StyleSheet.create({
  banner: { borderRadius: 14, overflow: "hidden", marginBottom: 6 },
  bannerText: { position: "absolute", left: 14, right: 14, bottom: 12 },
  bannerName: { fontFamily: fonts.display, fontSize: 19, color: "#fff" },
  bannerSub: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#fff", marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  rule: { borderBottomWidth: 1, borderBottomColor: ui.line },
  photo: { borderRadius: 12, overflow: "hidden" },
  name: { fontFamily: fonts.title, fontSize: 15.5, color: ui.ink },
  meta: { fontFamily: fonts.body, fontSize: 12, color: ui.sub, marginTop: 2 },
  line: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  rating: { fontFamily: fonts.bodySemi, fontSize: 12, color: ui.ink },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
