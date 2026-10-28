import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Photo } from "@/components/photo";
import { EmptyState } from "@/components/empty-state";
import { HomeSkeleton } from "@/components/skeleton";
import { OfflineNotice } from "@/components/offline-notice";
import { OfflineBanner } from "@/components/offline-banner";
import { NotificationBell } from "@/components/notification-bell";
import { CompleteAccountPrompt } from "@/components/complete-account-prompt";
import { MkScreen } from "@/components/mk";
import { supabase } from "@/lib/supabase";
import { fonts, ui } from "@/lib/theme";
import { formatKw } from "@/lib/lipila";
import { useCachedLoad } from "@/lib/offline-cache";
import { currentProfile } from "@/lib/session";

const W = Dimensions.get("window").width;
const PAD = 16;
const GAP = 12;
const CARD_W = (W - PAD * 2 - GAP) / 2;
const DEFAULT_TAGLINE = "Good Food. Closer to You.";
const DEFAULT_CITY = "Lusaka";
const DEFAULT_MARKETS_TITLE = "Food Markets Near You";
const DEFAULT_BANNER = {
  title: "Delicious\nMeals from\nYour Favourite\nFood Markets",
  subtitle: "Fresh. Tasty. Local.",
};

function greetingForHour(h: number): string {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const locAnim = useRef(new Animated.Value(0)).current;
  const [firstName, setFirstName] = useState<string>("");

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(locAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(locAnim, { toValue: -1, duration: 180, useNativeDriver: true }),
        Animated.timing(locAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ])
    ).start();
  }, [locAnim]);

  useEffect(() => {
    currentProfile().then(({ profile }) => {
      const full = (profile?.full_name || "").trim();
      if (!full) return;
      setFirstName(full.split(/\s+/)[0]);
    });
  }, []);

  const marketsQ = useCachedLoad<any[]>("home.markets", () =>
    supabase.from("markets").select("*").eq("is_active", true).order("sort_order")
  );
  const promoQ = useCachedLoad<any>("home.promotion", () =>
    supabase.from("promotion").select("*").eq("id", 1).maybeSingle()
  );
  const settingsQ = useCachedLoad<any>("home.settings", () =>
    supabase.from("settings").select("*").eq("id", 1).maybeSingle()
  );
  // Real active vendor counts per market — no invented numbers
  const vendorsQ = useCachedLoad<any[]>("home.vendorCounts", () =>
    supabase.from("vendors").select("market_id").eq("is_active", true)
  );

  const markets = marketsQ.data || [];
  const promotion = promoQ.data && promoQ.data.is_active !== false ? promoQ.data : null;
  const cfg = settingsQ.data || {};
  const city: string = cfg.home_city || DEFAULT_CITY;
  const marketsTitle: string = cfg.home_markets_title || DEFAULT_MARKETS_TITLE;
  const loading = marketsQ.loading;
  const offline = marketsQ.stale;
  const failed = marketsQ.failed;

  const vendorCountByMarket = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of vendorsQ.data || []) {
      const mid = v.market_id;
      if (!mid) continue;
      map[mid] = (map[mid] || 0) + 1;
    }
    return map;
  }, [vendorsQ.data]);

  const hour = new Date().getHours();
  const greet = greetingForHour(hour);
  const greetLine = firstName ? `${greet}, ${firstName}` : greet;

  const retry = useCallback(() => {
    marketsQ.reload();
    promoQ.reload();
    settingsQ.reload();
    vendorsQ.reload();
  }, [marketsQ.reload, promoQ.reload, settingsQ.reload, vendorsQ.reload]);

  // Admin-managed promotion banner. If a meal is linked, tapping opens that meal.
  const banner = {
    uri: promotion?.image_url || null,
    title: promotion ? promotion.title || "" : DEFAULT_BANNER.title,
    subtitle: promotion ? promotion.subtitle || "" : DEFAULT_BANNER.subtitle,
    amount: promotion ? promotion.amount : null,
    mealId: promotion?.meal_id || null,
  };

  function openBanner() {
    if (banner.mealId) {
      router.push({ pathname: "/(customer)/meal/[id]", params: { id: String(banner.mealId) } });
    }
  }

  return (
    <MkScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {/* Header: logo + greeting + location + bell */}
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Image
              source={require("../../assets/logo-wordmark-cropped.png")}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel="Matebeto"
            />
            <Text style={styles.greet}>{greetLine}</Text>
            <View style={styles.locRow}>
              <Animated.View style={{ transform: [{ translateX: locAnim }] }}>
                <Ionicons name="location-sharp" size={14} color={ui.amber} />
              </Animated.View>
              <Text style={styles.locText}>{city}</Text>
            </View>
          </View>
          <NotificationBell />
        </View>

        {/* Featured / promotion banner — Admin image + optional linked meal */}
        <View style={{ paddingHorizontal: PAD }}>
          <Pressable
            onPress={openBanner}
            disabled={!banner.mealId}
            style={[styles.banner, { backgroundColor: ui.banner }]}
          >
            {banner.uri ? (
              <>
                <Image source={{ uri: banner.uri }} style={styles.bannerFood} contentFit="cover" />
                <LinearGradient
                  colors={[ui.banner, "rgba(64,20,43,0)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.bannerFade}
                />
              </>
            ) : null}
            <View style={styles.bannerCopy}>
              {banner.title ? <Text style={styles.bannerTitle}>{banner.title}</Text> : null}
              {banner.amount != null ? (
                <Text style={styles.bannerAmount}>{formatKw(Number(banner.amount))}</Text>
              ) : null}
              {banner.subtitle ? <Text style={styles.bannerSub}>{banner.subtitle}</Text> : null}
              {banner.mealId ? (
                <Text style={styles.bannerCta}>Tap to view menu</Text>
              ) : (
                <View style={styles.bannerRule} />
              )}
            </View>
          </Pressable>
        </View>

        {/* Markets grid */}
        <View style={{ paddingHorizontal: PAD }}>
          <Text style={styles.section}>{marketsTitle}</Text>

          {failed ? (
            <OfflineNotice onRetry={retry} />
          ) : loading ? (
            <HomeSkeleton />
          ) : (
            <>
              {offline ? <OfflineBanner /> : null}
              {markets.length === 0 ? (
                <EmptyState icon="storefront" color={ui.red} title="No markets yet" />
              ) : (
                <View style={styles.grid}>
                  {markets.map((m) => {
                    const dist =
                      m.distance_km != null && m.distance_km !== ""
                        ? `${Number(m.distance_km)} km away`
                        : null;
                    const vCount = vendorCountByMarket[m.id] || 0;
                    const metaParts: string[] = [];
                    if (dist) metaParts.push(dist);
                    if (vCount > 0) metaParts.push(`${vCount} active vendor${vCount === 1 ? "" : "s"}`);
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => router.push(`/(customer)/market/${m.id}`)}
                        style={styles.card}
                      >
                        <View style={{ height: Math.round(CARD_W * 0.72), overflow: "hidden" }}>
                          <Photo
                            uri={m.image_url}
                            name={m.name}
                            height={Math.round(CARD_W * 0.72)}
                            hideLabel
                          />
                          <LinearGradient
                            colors={["transparent", "rgba(0,0,0,0.7)"]}
                            style={StyleSheet.absoluteFill}
                          />
                          <View style={styles.onImage}>
                            <Text style={styles.onImageName} numberOfLines={1}>
                              {m.name}
                            </Text>
                            {metaParts.length > 0 ? (
                              <View style={styles.metaRow}>
                                {dist ? (
                                  <View style={styles.metaChip}>
                                    <Ionicons name="location-outline" size={11} color="#fff" />
                                    <Text style={styles.metaText}>{dist}</Text>
                                  </View>
                                ) : null}
                                {vCount > 0 ? (
                                  <View style={styles.metaChip}>
                                    <MaterialCommunityIcons name="storefront-outline" size={11} color="#fff" />
                                    <Text style={styles.metaText}>
                                      {vCount} active vendor{vCount === 1 ? "" : "s"}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* More markets strip — matches mockup, no invented markets */}
              <View style={styles.moreStrip}>
                <MaterialCommunityIcons name="storefront-outline" size={28} color={ui.amber} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.moreTitle}>More markets coming soon!</Text>
                  <Text style={styles.moreSub}>We're adding more food markets across {city}.</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <CompleteAccountPrompt />
    </MkScreen>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingHorizontal: PAD,
    paddingTop: 2,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
  },
  logo: { width: 132, height: 48, marginLeft: -4 },
  greet: {
    fontFamily: fonts.title,
    fontSize: 16,
    color: ui.ink,
    marginTop: 4,
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locText: { fontFamily: fonts.bodySemi, fontSize: 13, color: ui.sub },
  banner: { height: 176, borderRadius: 14, overflow: "hidden" },
  bannerFood: { position: "absolute", top: 0, right: 0, bottom: 0, width: "56%" },
  bannerFade: { position: "absolute", top: 0, bottom: 0, left: "40%", width: 60 },
  bannerCopy: { flex: 1, justifyContent: "center", paddingHorizontal: 18, maxWidth: "58%" },
  bannerTitle: { color: "#fff", fontFamily: fonts.title, fontSize: 19, lineHeight: 24 },
  bannerSub: { color: "#F3E7EC", fontFamily: fonts.body, fontSize: 10, marginTop: 10 },
  bannerRule: { width: 38, height: 3, borderRadius: 2, backgroundColor: ui.amber, marginTop: 6 },
  bannerAmount: { color: ui.amber, fontFamily: fonts.title, fontSize: 15, marginTop: 6 },
  bannerCta: {
    color: ui.amber,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    marginTop: 10,
  },
  section: { fontFamily: fonts.title, fontSize: 17, color: ui.ink, marginTop: 18, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  card: {
    width: CARD_W,
    borderRadius: 14,
    overflow: "hidden",
  },
  onImage: { position: "absolute", left: 10, right: 10, bottom: 10 },
  onImageName: { fontFamily: fonts.title, fontSize: 14, color: "#fff" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontFamily: fonts.body, fontSize: 10, color: "#fff" },
  moreStrip: {
    marginTop: 18,
    backgroundColor: "#FFFBF0",
    borderWidth: 1,
    borderColor: "#F5E6C8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  moreTitle: { fontFamily: fonts.title, fontSize: 13.5, color: ui.ink },
  moreSub: { fontFamily: fonts.body, fontSize: 11, color: ui.sub, marginTop: 2 },
});
