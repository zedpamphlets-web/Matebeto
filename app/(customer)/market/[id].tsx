import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Photo } from "@/components/photo";
import { HeartButton, MkHeader, MkScreen } from "@/components/mk";
import { supabase } from "@/lib/supabase";
import { useCachedLoad } from "@/lib/offline-cache";
import { LoadingScreen } from "@/components/spinner";
import { OfflineNotice } from "@/components/offline-notice";
import { OfflineBanner } from "@/components/offline-banner";
import { EmptyState } from "@/components/empty-state";
import { fonts, ui } from "@/lib/theme";
import { marketShortName } from "@/lib/format";
import { useFavourite } from "@/lib/favourites";

const PAD = 16;

export default function MarketRestaurants() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const marketQ = useCachedLoad<any>(`market.${id}`, () =>
    supabase.from("markets").select("*").eq("id", id).maybeSingle()
  );
  const vendorsQ = useCachedLoad<any[]>(`market.${id}.restaurants`, () =>
    supabase
      .from("vendors")
      .select("*")
      .eq("market_id", id)
      .eq("is_active", true)
      .order("name")
  );

  const market = marketQ.data;
  const restaurants = vendorsQ.data || [];
  const loading = marketQ.loading || vendorsQ.loading;
  const failed = marketQ.failed && vendorsQ.failed;
  const stale = marketQ.stale || vendorsQ.stale;
  const fav = useFavourite("market", id);
  const name = marketShortName(market?.name);
  const dist =
    market?.distance_km != null && market?.distance_km !== ""
      ? `${Number(market.distance_km)} km`
      : null;

  const retry = () => {
    marketQ.reload();
    vendorsQ.reload();
  };

  return (
    <MkScreen>
      <MkHeader
        title={name || "Restaurants"}
        subtitle={dist ? `${name || "Market"} · ${dist}` : "Food Market"}
        right={<HeartButton on={fav.on} onPress={fav.toggle} />}
      />
      {failed ? (
        <OfflineNotice onRetry={retry} />
      ) : loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {stale ? <OfflineBanner /> : null}

          <View style={styles.marketBanner}>
            <Photo uri={market?.image_url} name={market?.name} height={120} />
            <View style={styles.marketBannerOverlay}>
              <Ionicons name="location" size={14} color="#fff" />
              <Text style={styles.marketBannerText} numberOfLines={1}>
                {market?.name || "Market"}
                {restaurants.length > 0
                  ? ` · ${restaurants.length} restaurant${restaurants.length === 1 ? "" : "s"}`
                  : ""}
              </Text>
            </View>
          </View>

          <Text style={styles.h}>Restaurants</Text>
          <Text style={styles.sub}>Choose a restaurant in {name || "this market"}.</Text>

          {restaurants.length === 0 ? (
            <EmptyState icon="storefront" color={ui.red} title="No restaurants yet" />
          ) : (
            restaurants.map((r) => {
              const open = r.is_available !== false;
              return (
                <Pressable
                  key={r.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(customer)/restaurant/[id]",
                      params: {
                        id: r.id,
                        marketId: String(id),
                        marketName: market?.name || "",
                      },
                    })
                  }
                  style={styles.row}
                >
                  <View style={styles.avatar}>
                    <Photo uri={r.image_url} name={r.name} height={64} hideLabel />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <View style={styles.metaLine}>
                      {r.stand_number ? (
                        <Text style={styles.meta}>Stand {r.stand_number}</Text>
                      ) : null}
                      {dist ? (
                        <Text style={styles.meta}>
                          {r.stand_number ? " · " : ""}
                          {dist}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: open ? "#1F9D55" : ui.hint },
                        ]}
                      />
                      <Text style={[styles.status, !open && { color: ui.hint }]}>
                        {open ? "Open" : "Closed"}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={ui.hint} />
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </MkScreen>
  );
}

const styles = StyleSheet.create({
  marketBanner: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    height: 120,
  },
  marketBannerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  marketBannerText: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#fff", flex: 1 },
  h: { fontFamily: fonts.title, fontSize: 17, color: ui.ink },
  sub: { fontFamily: fonts.body, fontSize: 12.5, color: ui.sub, marginTop: 4, marginBottom: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: ui.field,
  },
  rowName: { fontFamily: fonts.title, fontSize: 15, color: ui.ink },
  metaLine: { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },
  meta: { fontFamily: fonts.body, fontSize: 12, color: ui.sub },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  status: { fontFamily: fonts.bodySemi, fontSize: 11.5, color: "#1F9D55" },
});
