import { useCallback, useEffect, useRef, useState } from "react";
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
import { loadAccount } from "@/lib/profile";
import { loadRestaurants, type Restaurant } from "@/lib/restaurants";
import { marketDistanceKm, useCoords } from "@/lib/location";
import { countLabel, distanceText, greeting } from "@/lib/format";

const W = Dimensions.get("window").width;
const PAD = 16;
const GAP = 12;
const CARD_W = (W - PAD * 2 - GAP) / 2;
const DEFAULT_TAGLINE = "Good Food. Closer to You.";
const DEFAULT_CITY = "Lusaka";
const DEFAULT_MARKETS_TITLE = "Food Markets Near You";
const DEFAULT_PROMO_TITLE = "More markets coming soon!";
const DEFAULT_BANNER = {
  title: "Delicious\nMeals from\nYour Favourite\nFood Markets",
  subtitle: "Fresh. Tasty. Local.",
};

export default function Home() {
  const locAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(locAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(locAnim, { toValue: -1, duration: 180, useNativeDriver: true }),
        Animated.timing(locAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ])
    ).start();
  }, [locAnim]);

  // Each list keeps a saved copy on the phone, so with no internet the menu still shows.
  const marketsQ = useCachedLoad<any[]>("home.markets", () =>
    supabase.from("markets").select("*").eq("is_active", true).order("sort_order")
  );
  const promoQ = useCachedLoad<any>("home.promotion", () =>
    supabase.from("promotion").select("*").eq("id", 1).maybeSingle()
  );

  const settingsQ = useCachedLoad<any>("home.settings", () =>
    supabase.from("settings").select("*").eq("id", 1).maybeSingle()
  );

  const restaurantsQ = useCachedLoad<Restaurant[]>("home.restaurants", () => loadRestaurants(null));
  const restaurants = restaurantsQ.data || [];
  const me = useCoords();
  const [firstName, setFirstName] = useState("");
  useEffect(() => {
    loadAccount().then(({ details }) => setFirstName(String(details.full_name || "").trim().split(/\s+/)[0] || ""));
  }, []);
  const vendorCount = (marketId: string) => restaurants.filter((r) => r.market_id === marketId).length;

  const markets = marketsQ.data || [];
  const promotion = promoQ.data && promoQ.data.is_active !== false ? promoQ.data : null;
  const cfg = settingsQ.data || {};
  const tagline: string = cfg.home_tagline || DEFAULT_TAGLINE;
  const city: string = cfg.home_city || DEFAULT_CITY;
  const marketsTitle: string = cfg.home_markets_title || DEFAULT_MARKETS_TITLE;
  const promoOn = cfg.promo_enabled !== false;
  const promoTitle: string = cfg.promo_title || DEFAULT_PROMO_TITLE;
  const promoSub: string = cfg.promo_subtitle || `We're adding more food markets across ${city}.`;
  const loading = marketsQ.loading;
  const offline = marketsQ.stale; // showing the saved copy
  const failed = marketsQ.failed; // nothing saved and no internet

  const retry = useCallback(() => {
    marketsQ.reload();
    promoQ.reload();
    settingsQ.reload();
    restaurantsQ.reload();
  }, [marketsQ.reload, promoQ.reload, settingsQ.reload, restaurantsQ.reload]);

  // One static promotion, edited in Admin (Home tab > Promotion). With none set, the approved Matebeto banner shows.
  const banner = {
    uri: promotion?.image_url || null,
    title: promotion ? promotion.title || "" : DEFAULT_BANNER.title,
    subtitle: promotion ? promotion.subtitle || "" : DEFAULT_BANNER.subtitle,
    amount: promotion ? promotion.amount : null,
    vendorId: promotion?.vendor_id || null,
    label: promotion ? promotion.label || restaurants.find((r) => r.id === promotion.vendor_id)?.name || "" : "",
    button: promotion?.button_text || "Tap to view menu",
  };
  // The banner opens that restaurant's own menu through the normal ordering flow.
  const openBanner = () => {
    if (banner.vendorId) router.push({ pathname: "/(customer)/restaurant/[id]", params: { id: banner.vendorId } });
  };

  return (
    <MkScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {/* Header: logo, bell, greeting, location */}
        <View style={styles.top}>
          <Image
            source={require("../../assets/logo-wordmark-cropped.png")}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Matebeto"
          />
          <NotificationBell />
        </View>
        <View style={{ paddingHorizontal: PAD, marginBottom: 12 }}>
          <Text style={styles.greet}>
            {greeting()}
            {firstName ? `, ${firstName}` : ""} 👋
          </Text>
          <View style={styles.where}>
            <Animated.View style={{ transform: [{ translateX: locAnim }] }}>
              <Ionicons name="location-sharp" size={15} color={ui.amber} />
            </Animated.View>
            <Text style={styles.whereText}>{city}</Text>
          </View>
        </View>

        {/* Promotion: one static banner. Tapping it opens that restaurant's menu. */}
        <View style={{ paddingHorizontal: PAD }}>
          <Pressable
            disabled={!banner.vendorId}
            onPress={openBanner}
            accessibilityRole={banner.vendorId ? "button" : undefined}
            style={[styles.banner, { backgroundColor: ui.banner }]}
          >
            {banner.uri ? (
              <>
                <Image source={{ uri: banner.uri }} style={styles.bannerFood} contentFit="cover" />
                <LinearGradient
                  colors={["rgba(64,20,43,0.92)", "rgba(64,20,43,0.55)", "rgba(64,20,43,0)"]}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              </>
            ) : null}
            <View style={styles.bannerCopy}>
              {banner.vendorId ? (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>Featured</Text>
                </View>
              ) : null}
              {banner.label ? <Text style={styles.bannerLabel} numberOfLines={1}>{banner.label}</Text> : null}
              {banner.title ? <Text style={styles.bannerTitle}>{banner.title}</Text> : null}
              {banner.amount != null ? <Text style={styles.bannerAmount}>{formatKw(Number(banner.amount))}</Text> : null}
              {banner.subtitle ? <Text style={styles.bannerSub}>{banner.subtitle}</Text> : null}
              {banner.vendorId ? (
                <View style={styles.bannerBtn}>
                  <Text style={styles.bannerBtnText}>{banner.button}</Text>
                  <Ionicons name="chevron-forward" size={14} color={ui.ink} />
                </View>
              ) : (
                <View style={styles.bannerRule} />
              )}
            </View>
          </Pressable>
        </View>

        {/* Markets */}
        <View style={{ paddingHorizontal: PAD }}>
          <Text style={styles.section}>{marketsTitle}</Text>
          <View style={{ height: 12 }} />

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
                  {markets.map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => router.push(`/(customer)/market/${m.id}`)}
                      style={styles.card}
                    >
                      <Photo uri={m.image_url} name={m.name} height={Math.round(CARD_W * 0.62)} hideLabel />
                      <View style={styles.cardBody}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardName} numberOfLines={1}>{m.name}</Text>
                          {distanceText(marketDistanceKm(m, me)) ? (
                            <View style={styles.metaRow}>
                              <Ionicons name="location-sharp" size={12} color={ui.red} />
                              <Text style={styles.cardMeta} numberOfLines={1}>{distanceText(marketDistanceKm(m, me))}</Text>
                            </View>
                          ) : null}
                          <View style={styles.metaRow}>
                            <Ionicons name="storefront-outline" size={12} color={ui.sub} />
                            <Text style={styles.cardMeta} numberOfLines={1}>
                              {countLabel(vendorCount(m.id), "active vendor", "active vendors")}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={ui.hint} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {promoOn ? (
                <Pressable onPress={() => router.push("/(customer)/markets")} style={styles.promo}>
                  <MaterialCommunityIcons name="storefront-outline" size={34} color={ui.amber} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.promoTitle}>{promoTitle}</Text>
                    <Text style={styles.promoSub}>{promoSub}</Text>
                  </View>
                  <Text style={styles.promoLink}>View all markets</Text>
                  <Ionicons name="chevron-forward" size={16} color={ui.amber} />
                </Pressable>
              ) : null}
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
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  logo: { width: 132, height: 57, marginLeft: -4 },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  greet: { fontFamily: fonts.title, fontSize: 19, color: ui.ink },
  banner: { height: 190, borderRadius: 14, overflow: "hidden" },
  pill: { alignSelf: "flex-start", backgroundColor: ui.amber, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 6 },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 10, color: ui.ink },
  bannerLabel: { color: "#F3E7EC", fontFamily: fonts.bodySemi, fontSize: 11, marginBottom: 2 },
  bannerBtn: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: ui.amber, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7, marginTop: 10 },
  bannerBtnText: { fontFamily: fonts.bodySemi, fontSize: 11.5, color: ui.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  promoLink: { fontFamily: fonts.bodySemi, fontSize: 11.5, color: ui.amber, marginRight: 2 },
  bannerFood: { ...StyleSheet.absoluteFillObject },
  bannerCopy: { flex: 1, justifyContent: "center", paddingHorizontal: 18, maxWidth: "64%" },
  bannerTitle: { color: "#fff", fontFamily: fonts.title, fontSize: 18, lineHeight: 23 },
  bannerSub: { color: "#F3E7EC", fontFamily: fonts.body, fontSize: 10, marginTop: 10 },
  bannerRule: { width: 38, height: 3, borderRadius: 2, backgroundColor: ui.amber, marginTop: 6 },
  bannerAmount: { color: ui.amber, fontFamily: fonts.title, fontSize: 15, marginTop: 6 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ui.checkOff },
  dotOn: { backgroundColor: ui.red, width: 16 },
  section: { fontFamily: fonts.title, fontSize: 17, color: ui.ink, marginTop: 18 },
  where: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  whereText: { fontFamily: fonts.bodySemi, fontSize: 13, color: ui.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  card: {
    width: CARD_W,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: ui.line,
  },
  onImage: { position: "absolute", left: 10, right: 10, bottom: 10 },
  onImageName: { fontFamily: fonts.title, fontSize: 14, color: "#fff" },
  cardBody: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 9 },
  cardName: { fontFamily: fonts.title, fontSize: 14, color: ui.ink },
  cardMeta: { fontFamily: fonts.body, fontSize: 11.5, color: ui.sub, flexShrink: 1 },
  promo: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: ui.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  promoTitle: { fontFamily: fonts.title, fontSize: 13.5, color: ui.ink },
  promoSub: { fontFamily: fonts.body, fontSize: 11, color: ui.sub, marginTop: 2 },
});
