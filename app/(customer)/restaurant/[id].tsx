import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Photo } from "@/components/photo";
import { MkHeader, MkScreen } from "@/components/mk";
import { supabase } from "@/lib/supabase";
import { useCachedLoad } from "@/lib/offline-cache";
import { LoadingScreen } from "@/components/spinner";
import { OfflineNotice } from "@/components/offline-notice";
import { OfflineBanner } from "@/components/offline-banner";
import { EmptyState } from "@/components/empty-state";
import { fonts, ui } from "@/lib/theme";
import { kw } from "@/lib/format";

const W = Dimensions.get("window").width;
const PAD = 16;
const GAP = 12;
const TILE_W = (W - PAD * 2 - GAP) / 2;

export default function RestaurantMenu() {
  const { id, marketId, marketName } = useLocalSearchParams<{
    id: string;
    marketId?: string;
    marketName?: string;
  }>();

  const vendorQ = useCachedLoad<any>(`restaurant.${id}`, () =>
    supabase.from("vendors").select("*, markets(name, distance_km)").eq("id", id).maybeSingle()
  );
  const linksQ = useCachedLoad<any[]>(`restaurant.${id}.meals`, () =>
    supabase
      .from("vendor_meals")
      .select("meal_id, is_available, meals(*)")
      .eq("vendor_id", id)
      .eq("is_available", true)
  );

  const vendor = vendorQ.data;
  const meals = (linksQ.data || [])
    .map((row: any) => row.meals)
    .filter((m: any) => m && m.is_available !== false);
  const loading = vendorQ.loading || linksQ.loading;
  const failed = vendorQ.failed && linksQ.failed;
  const stale = vendorQ.stale || linksQ.stale;
  const marketLabel =
    marketName || vendor?.markets?.name || vendor?.market_name || "Market";
  const open = vendor?.is_available !== false;

  const retry = () => {
    vendorQ.reload();
    linksQ.reload();
  };

  function openMeal(mealId: string) {
    router.push({
      pathname: "/(customer)/meal/[id]",
      params: {
        id: mealId,
        marketId: String(marketId || vendor?.market_id || ""),
        marketName: String(marketLabel),
        vendorId: String(id),
        vendorName: String(vendor?.name || ""),
      },
    });
  }

  return (
    <MkScreen>
      <MkHeader
        title={vendor?.name || "Restaurant"}
        subtitle={
          vendor?.stand_number
            ? `Stand ${vendor.stand_number} · ${marketLabel}`
            : marketLabel
        }
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

          <View style={styles.hero}>
            <Photo
              uri={vendor?.image_url}
              name={vendor?.name}
              height={160}
            />
          </View>

          <Text style={styles.name}>{vendor?.name}</Text>
          <View style={styles.chips}>
            {vendor?.stand_number ? (
              <View style={styles.chip}>
                <Ionicons name="storefront-outline" size={13} color={ui.sub} />
                <Text style={styles.chipText}>Stand {vendor.stand_number}</Text>
              </View>
            ) : null}
            <View style={styles.chip}>
              <View
                style={[styles.dot, { backgroundColor: open ? "#1F9D55" : ui.hint }]}
              />
              <Text style={[styles.chipText, open && { color: "#1F9D55" }]}>
                {open ? "Open" : "Closed"}
              </Text>
            </View>
          </View>

          <Text style={styles.h}>Our Meals</Text>
          <Text style={styles.sub}>Prepared and served with nshima.</Text>

          {meals.length === 0 ? (
            <EmptyState icon="restaurant" color={ui.red} title="No meals on this menu yet" />
          ) : (
            <View style={styles.grid}>
              {meals.map((m: any) => (
                <Pressable
                  key={m.id}
                  onPress={() => openMeal(m.id)}
                  style={styles.tile}
                >
                  <View style={{ height: Math.round(TILE_W * 0.72), overflow: "hidden" }}>
                    <Photo
                      uri={m.image_url}
                      name={m.name}
                      height={Math.round(TILE_W * 0.72)}
                      hideLabel
                    />
                  </View>
                  <View style={styles.tileBody}>
                    <Text style={styles.tileName} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text style={styles.tileDesc} numberOfLines={1}>
                      Prepared and served with nshima.
                    </Text>
                    <View style={styles.tileFoot}>
                      <Text style={styles.tilePrice}>{kw(m.price)}</Text>
                      <Ionicons name="chevron-forward" size={16} color={ui.hint} />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </MkScreen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 14, overflow: "hidden", marginBottom: 12 },
  name: { fontFamily: fonts.title, fontSize: 20, color: ui.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: ui.field,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12, color: ui.sub },
  dot: { width: 7, height: 7, borderRadius: 4 },
  h: { fontFamily: fonts.title, fontSize: 17, color: ui.ink },
  sub: { fontFamily: fonts.body, fontSize: 12.5, color: ui.sub, marginTop: 4, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: {
    width: TILE_W,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: "#fff",
  },
  tileBody: { padding: 10 },
  tileName: { fontFamily: fonts.title, fontSize: 14, color: ui.ink },
  tileDesc: { fontFamily: fonts.body, fontSize: 11, color: ui.sub, marginTop: 2 },
  tileFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  tilePrice: { fontFamily: fonts.title, fontSize: 14, color: ui.red },
});
